import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listUsage = (resourceId, appId, db = prisma) =>
  db.cadenzaRental.findMany({
    where: { resourceId, appId },
    orderBy: [{ scheduledStart: 'desc' }, { createdAt: 'desc' }],
    include: { customer: { include: { person: true } } },
  })

export { listUsage }
