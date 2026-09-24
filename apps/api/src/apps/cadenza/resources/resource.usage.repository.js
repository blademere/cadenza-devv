import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listUsage = async (resourceId, appId, db = prisma) => {
  const rentals = await db.cadenzaRental.findMany({
    where: {
      appId,
      ...(resourceId ? { resourceId } : {}),
    },
    orderBy: [{ scheduledStart: 'desc' }, { createdAt: 'desc' }],
    include: {
      customer: { include: { person: true } },
    },
  })

  if (rentals.length === 0) return rentals

  const resourceIds = [...new Set(rentals.map((rental) => rental.resourceId))]
  const resources = await db.resource.findMany({
    where: {
      appId,
      id: { in: resourceIds },
    },
  })

  const resourceById = new Map(resources.map((resource) => [resource.id, resource]))

  return rentals.map((rental) => ({
    ...rental,
    resource: resourceById.get(rental.resourceId) ?? null,
  }))
}

export { listUsage }
