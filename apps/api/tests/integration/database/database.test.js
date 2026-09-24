import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const {
  getPrismaClient,
} = require('../../../src/infrastructure/database/prisma')

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('database integration', () => {
  describe('appointment capacity', () => {
    let appointmentType
    let slot

    beforeAll(async () => {
      await prisma.$connect()
      appointmentType = await prisma.appointmentType.create({
        data: {
          key: `capacity-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: 'Capacity concurrency test',
          defaultCapacity: 1,
        },
      })
      slot = await prisma.appointmentSlot.create({
        data: {
          appointmentTypeId: appointmentType.id,
          startsAt: new Date(Date.now() + 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 90 * 60 * 1000),
          capacity: 1,
          bookedCount: 0,
          status: 'OPEN',
        },
      })
    })

    afterAll(async () => {
      if (slot) await prisma.appointmentSlot.delete({ where: { id: slot.id } })
      if (appointmentType)
        await prisma.appointmentType.delete({
          where: { id: appointmentType.id },
        })
      await prisma.$disconnect()
    })

    it('allows at most capacity successful claims under concurrent contention', async () => {
      const results = await Promise.all([
        prisma.appointmentSlot.updateMany({
          where: {
            id: slot.id,
            status: 'OPEN',
            bookedCount: { lt: slot.capacity },
          },
          data: { bookedCount: { increment: 1 } },
        }),
        prisma.appointmentSlot.updateMany({
          where: {
            id: slot.id,
            status: 'OPEN',
            bookedCount: { lt: slot.capacity },
          },
          data: { bookedCount: { increment: 1 } },
        }),
      ])

      expect(results.filter((result) => result.count === 1)).toHaveLength(1)
      const persisted = await prisma.appointmentSlot.findUnique({
        where: { id: slot.id },
      })
      expect(persisted.bookedCount).toBe(1)
      expect(persisted.bookedCount).toBeLessThanOrEqual(persisted.capacity)
    })
  })
})
