import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findByKey = (key, db = prisma) => db.integration.findUnique({ where: { key } })
const create = (data, db = prisma) => db.integration.create({ data })
const upsertEvent = ({ integrationId, event, config }, db = prisma) =>
  db.integrationEvent.upsert({
    where: { integrationId_event: { integrationId, event } },
    create: { integrationId, event, config },
    update: { active: true, config },
  })
const findActiveSubscribers = (event, db = prisma) =>
  db.integrationEvent.findMany({
    where: { event, active: true, integration: { active: true } },
    include: { integration: true },
  })

export { findByKey, create, upsertEvent, findActiveSubscribers }
