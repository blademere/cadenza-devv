const crypto = require("node:crypto")
const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")

const createEndpoint = async ({ key, name, url, events = [], integrationId = null, secretRef = null, headers = null }) => {
  if (!key || !name || !url) throw new BadRequestError("Webhook key, name, and URL are required.")
  try { new URL(url) } catch { throw new BadRequestError("Webhook URL must be valid.") }
  if (!Array.isArray(events) || events.length === 0) throw new BadRequestError("A webhook must subscribe to at least one event.")
  if (await prisma.webhookEndpoint.findUnique({ where: { key } })) throw new ConflictError(`Webhook '${key}' already exists.`)
  return prisma.webhookEndpoint.create({ data: { key, name, url, events, integrationId, secretRef, headers } })
}

const queueEvent = async ({ event, entityType = null, entityId = null, payload }) => {
  if (!event || payload === undefined) throw new BadRequestError("Webhook event and payload are required.")
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { active: true, events: { has: event } } })
  if (endpoints.length === 0) return []
  return prisma.$transaction(endpoints.map((endpoint) => prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, event, entityType, entityId: entityId == null ? null : String(entityId), payload } })))
}

const signPayload = ({ payload, secret }) => {
  if (!secret) throw new BadRequestError("A secret is required to sign a webhook payload.")
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
}

const markSent = async (deliveryId) => prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null } })

const markFailed = async (deliveryId, error, nextAttemptAt = null) => prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: nextAttemptAt ? "QUEUED" : "FAILED", attempts: { increment: 1 }, nextAttemptAt, lastError: String(error) } })

const getDueDeliveries = async (limit = 50) => prisma.webhookDelivery.findMany({ where: { status: "QUEUED", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, include: { endpoint: true }, orderBy: { createdAt: "asc" }, take: limit })

const getDelivery = async (id) => {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id }, include: { endpoint: true } })
  if (!delivery) throw new NotFoundError(`Webhook delivery '${id}' was not found.`)
  return delivery
}

module.exports = { createEndpoint, queueEvent, signPayload, markSent, markFailed, getDueDeliveries, getDelivery }
