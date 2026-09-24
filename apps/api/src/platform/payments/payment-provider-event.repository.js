import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findEvent = (provider, eventId, eventType, db = prisma) =>
  db.paymentProviderEvent.findUnique({
    where: { provider_eventId_eventType: { provider, eventId, eventType } },
  })

const createEvent = (data, db = prisma) => db.paymentProviderEvent.create({ data })

const markProcessed = (id, data, db = prisma) =>
  db.paymentProviderEvent.update({ where: { id }, data })

export { findEvent, createEvent, markProcessed }
