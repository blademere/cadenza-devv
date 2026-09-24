import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listUsage = (resourceId, appId, db = prisma) =>
  db.cadenzaRental.findMany({
    where: {
      appId,
      ...(resourceId ? { resourceId } : {}),
    },
    orderBy: [{ scheduledStart: 'desc' }, { createdAt: 'desc' }],
    include: {
      customer: { include: { person: true } },
      resource: true,
    },
  })

export { listUsage }
