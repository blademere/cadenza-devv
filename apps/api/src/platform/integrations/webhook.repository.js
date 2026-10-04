import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findEndpointByKey = (key, db = prisma) => db.webhookEndpoint.findUnique({ where: { key } })
const findActiveEndpointsForEvent = (event, db = prisma) =>
  db.webhookEndpoint.findMany({ where: { active: true, events: { has: event } } })
const createEndpoint = (data, db = prisma) => db.webhookEndpoint.create({ data })
const runTransaction = (operation, db = prisma) => db === prisma ? prisma.$transaction(operation) : operation(db)
const findIdempotentDeliveryId = (idempotencyKey, db) =>
  db.$queryRaw`SELECT "deliveryId" FROM "WebhookDeliveryIdempotency" WHERE "idempotencyKey" = ${idempotencyKey} LIMIT 1`
const createDelivery = (data, db) => db.webhookDelivery.create({ data })
const claimIdempotency = (idempotencyKey, deliveryId, db) =>
  db.$queryRaw`INSERT INTO "WebhookDeliveryIdempotency" ("idempotencyKey", "deliveryId") VALUES (${idempotencyKey}, ${deliveryId}) ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING "deliveryId"`
const deleteDelivery = (id, db) => db.webhookDelivery.delete({ where: { id } })
const findDeliveryById = (id, db = prisma) => db.webhookDelivery.findUnique({ where: { id }, include: { endpoint: true } })
const updateDelivery = (id, data, db = prisma) => db.webhookDelivery.update({ where: { id }, data })
const findDueDeliveries = (limit, db = prisma) =>
  db.webhookDelivery.findMany({
    where: { status: 'QUEUED', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
    include: { endpoint: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

export {
  findEndpointByKey,
  findActiveEndpointsForEvent,
  createEndpoint,
  runTransaction,
  findIdempotentDeliveryId,
  createDelivery,
  claimIdempotency,
  deleteDelivery,
  findDeliveryById,
  updateDelivery,
  findDueDeliveries,
}
