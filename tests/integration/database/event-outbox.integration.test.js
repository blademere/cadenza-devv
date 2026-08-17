import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'

const { getPrismaClient } = require('../../../src/infrastructure/database/prisma')
const {
  enqueueEvent,
  claimBatch,
  markProcessed,
  markFailed,
  recoverStale,
} = require('../../../src/platform/event-bus/event-outbox.service')

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('EventOutbox transactional consistency', () => {
  const createdEventIds = []

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

      return { user, event }
    })

    createdEventIds.push(result.event.id)
    const user = await prisma.user.findUnique({ where: { id: result.user.id } })
    const event = await prisma.$queryRaw`
      SELECT "id", "status", "entityId", "idempotencyKey"
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
      SELECT "status", "lastError", "lockToken"
      FROM "EventOutbox"
      WHERE "id" = ${claimed.id}
    `
    expect(stored[0]).toMatchObject({ status: 'RETRY', lastError: 'expected failure', lockToken: null })
  })

  it('recovers stale processing leases for retry', async () => {
    const idempotencyKey = `stale:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const created = await enqueueEvent({ event: 'integration.stale', idempotencyKey })
    createdEventIds.push(created.id)
    const [claimed] = await claimBatch({ batchSize: 1, leaseSeconds: 1 })

    expect(claimed.id).toBe(created.id)
    await prisma.$executeRaw`
      UPDATE "EventOutbox"
      SET "leaseUntil" = CURRENT_TIMESTAMP - INTERVAL '1 second'
      WHERE "id" = ${claimed.id}
    `

    const recovered = await recoverStale({ timeoutSeconds: 60 })
    expect(recovered).toBeGreaterThanOrEqual(1)

    const stored = await prisma.$queryRaw`
      SELECT "status", "availableAt", "lockToken", "leaseUntil"
      FROM "EventOutbox"
      WHERE "id" = ${claimed.id}
    `
    expect(stored[0]).toMatchObject({ status: 'RETRY', lockToken: null, leaseUntil: null })
  })
})
