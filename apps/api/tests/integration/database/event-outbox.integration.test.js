import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'

const { getPrismaClient } = require('../../../src/infrastructure/database/prisma')
const {
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
  MAX_ATTEMPTS,
} = require('../../../src/platform/event-bus/event-outbox.service')

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('EventOutbox transactional consistency', () => {
  const createdEventIds = []
  const createdUserIds = []
  const createdRoleIds = []

  beforeAll(async () => {
    await prisma.$connect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`
      DELETE FROM "EventOutbox"
      WHERE "event" LIKE 'integration.%'
    `
  })

  afterAll(async () => {
    if (createdEventIds.length) {
      for (const id of createdEventIds) {
        await prisma.$executeRaw`
          DELETE FROM "EventOutbox"
          WHERE "id" = ${id}
        `
      }
    }
    if (createdUserIds.length) {
      for (const id of createdUserIds) {
        await prisma.user.deleteMany({ where: { id } })
      }
    }
    if (createdRoleIds.length) {
      for (const id of createdRoleIds) {
        await prisma.role.deleteMany({ where: { id } })
      }
    }
    await prisma.$disconnect()
  })

  it('rolls back the domain write and outbox enqueue together', async () => {
    const email = `outbox-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`

    await expect(
      prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            name: `outbox-rollback-role-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
        })
        const user = await tx.user.create({
          data: { email, passwordHash: 'integration-test-hash', roleId: role.id },
        })

        await enqueueEvent({
          db: tx,
          event: 'integration.rollback',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          idempotencyKey: `rollback:${user.id}`,
        })

        throw new Error('force transaction rollback')
      })
    ).rejects.toThrow('force transaction rollback')

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user).toBeNull()

    const events = await prisma.$queryRaw`
      SELECT "id"
      FROM "EventOutbox"
      WHERE "idempotencyKey" LIKE 'rollback:%'
    `
    expect(events).toHaveLength(0)
  })

  it('commits the domain write and outbox enqueue atomically', async () => {
    const email = `outbox-commit-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
    const idempotencyKey = `commit:${Date.now()}:${Math.random().toString(36).slice(2)}`

    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: `outbox-commit-role-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      })
      const user = await tx.user.create({
        data: { email, passwordHash: 'integration-test-hash', roleId: role.id },
      })

      const event = await enqueueEvent({
        db: tx,
        event: 'integration.commit',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        idempotencyKey,
      })

      return { user, role, event }
    })

    createdEventIds.push(result.event.id)
    createdUserIds.push(result.user.id)
    createdRoleIds.push(result.role.id)

    const user = await prisma.user.findUnique({ where: { id: result.user.id } })
    const event = await prisma.$queryRaw`
      SELECT "id", "status", "entityId", "idempotencyKey", "deadAt"
      FROM "EventOutbox"
      WHERE "id" = ${result.event.id}
    `

    expect(user).not.toBeNull()
    expect(event).toHaveLength(1)
    expect(event[0]).toMatchObject({
      id: result.event.id,
      status: 'PENDING',
      entityId: String(result.user.id),
      idempotencyKey,
      deadAt: null,
    })
  })

  it('returns the existing event for a repeated idempotency key', async () => {
    const idempotencyKey = `duplicate:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const first = await enqueueEvent({ event: 'integration.duplicate', idempotencyKey })
    const second = await enqueueEvent({ event: 'integration.duplicate', idempotencyKey })
    createdEventIds.push(first.id)

    expect(second.id).toBe(first.id)
    expect(first.status).toBe('PENDING')
    expect(second.status).toBe('PENDING')
  })

  it('claims each available event once across concurrent workers', async () => {
    const keys = [
      `claim-a:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      `claim-b:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    ]
    const events = await Promise.all(
      keys.map((idempotencyKey) => enqueueEvent({ event: 'integration.claim', idempotencyKey }))
    )
    createdEventIds.push(...events.map((event) => event.id))

    const [first, second] = await Promise.all([
      claimBatch({ batchSize: 1, leaseSeconds: 60 }),
      claimBatch({ batchSize: 1, leaseSeconds: 60 }),
    ])

    const claimedIds = [...first, ...second].map((event) => event.id)
    expect(claimedIds).toHaveLength(2)
    expect(new Set(claimedIds).size).toBe(2)
    expect(claimedIds).toEqual(expect.arrayContaining(events.map((event) => event.id)))
  })

  it('requires the current lease owner to complete or fail an event', async () => {
    const idempotencyKey = `ownership:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const created = await enqueueEvent({ event: 'integration.ownership', idempotencyKey })
    createdEventIds.push(created.id)
    const [claimed] = await claimBatch({ batchSize: 1, leaseSeconds: 60 })

    expect(claimed.id).toBe(created.id)
    await expect(markProcessed(claimed.id, 'wrong-token')).rejects.toThrow(/no longer owned/)
    await expect(markFailed(claimed.id, new Error('expected failure'), 'wrong-token')).rejects.toThrow(/no longer owned/)

    await markFailed(claimed.id, new Error('expected failure'), claimed.lockToken)
    const stored = await prisma.$queryRaw`
      SELECT "status", "lastError", "lockToken", "deadAt"
      FROM "EventOutbox"
      WHERE "id" = ${claimed.id}
    `
    expect(stored[0]).toMatchObject({ status: 'RETRY', lastError: 'expected failure', lockToken: null, deadAt: null })
  })

  it('retries a failed event and allows a later claim to complete it', async () => {
    const idempotencyKey = `retry:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const created = await enqueueEvent({ event: 'integration.retry', idempotencyKey })
    createdEventIds.push(created.id)

    const [firstClaim] = await claimBatch({ batchSize: 1, leaseSeconds: 60 })
    expect(firstClaim.id).toBe(created.id)
    expect(firstClaim.attempts).toBe(1)

    await markFailed(firstClaim.id, new Error('transient integration failure'), firstClaim.lockToken)

    await prisma.$executeRaw`
      UPDATE "EventOutbox"
      SET "availableAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${created.id}
    `

    const [secondClaim] = await claimBatch({ batchSize: 1, leaseSeconds: 60 })
    expect(secondClaim.id).toBe(created.id)
    expect(secondClaim.attempts).toBe(2)
    expect(secondClaim.lockToken).not.toBe(firstClaim.lockToken)

    await markProcessed(secondClaim.id, secondClaim.lockToken)

    const stored = await prisma.$queryRaw`
      SELECT "status", "attempts", "lastError", "lockToken", "leaseUntil", "processedAt", "deadAt"
      FROM "EventOutbox"
      WHERE "id" = ${created.id}
    `
    expect(stored[0]).toMatchObject({
      status: 'PROCESSED',
      attempts: 2,
      lastError: null,
      lockToken: null,
      leaseUntil: null,
      deadAt: null,
    })
    expect(stored[0].processedAt).not.toBeNull()
  })

  it('moves an exhausted event to DEAD and records deadAt', async () => {
    const idempotencyKey = `dead:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const created = await enqueueEvent({ event: 'integration.dead', idempotencyKey })
    createdEventIds.push(created.id)

    await prisma.$executeRaw`
      UPDATE "EventOutbox"
      SET "attempts" = ${MAX_ATTEMPTS - 1}, "availableAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${created.id}
    `

    const [claimed] = await claimBatch({ batchSize: 1, leaseSeconds: 60 })
    expect(claimed.attempts).toBe(MAX_ATTEMPTS)

    await markFailed(claimed.id, new Error('permanent integration failure'), claimed.lockToken)

    const stored = await prisma.$queryRaw`
      SELECT "status", "attempts", "lastError", "deadAt", "availableAt"
      FROM "EventOutbox"
      WHERE "id" = ${created.id}
    `
    expect(stored[0].status).toBe('DEAD')
    expect(stored[0].attempts).toBe(MAX_ATTEMPTS)
    expect(stored[0].lastError).toBe('permanent integration failure')
    expect(stored[0].deadAt).not.toBeNull()
  })

  it('does not recover a processing event after the retry budget is exhausted', async () => {
    const idempotencyKey = `stale-dead:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const created = await enqueueEvent({ event: 'integration.stale-dead', idempotencyKey })
    createdEventIds.push(created.id)

    await prisma.$executeRaw`
      UPDATE "EventOutbox"
      SET "status" = 'PROCESSING', "attempts" = ${MAX_ATTEMPTS}, "lockedAt" = CURRENT_TIMESTAMP - INTERVAL '2 minutes', "leaseUntil" = CURRENT_TIMESTAMP - INTERVAL '1 minute', "lockToken" = 'stale-dead-token'
      WHERE "id" = ${created.id}
    `

    const recovered = await recoverStale({ timeoutSeconds: 60 })
    expect(recovered).toBe(0)

    const stored = await prisma.$queryRaw`
      SELECT "status", "attempts", "lockToken"
      FROM "EventOutbox"
      WHERE "id" = ${created.id}
    `
    expect(stored[0]).toMatchObject({ status: 'PROCESSING', attempts: MAX_ATTEMPTS, lockToken: 'stale-dead-token' })
  })
})
