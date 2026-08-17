const crypto = require("node:crypto")
const dns = require("node:dns").promises
const net = require("node:net")
const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")

const isPrivateIpv4 = (ip) => {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0
}

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip)
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase()
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")
  }
  return true
}

const assertSafeWebhookUrl = async (url) => {
  let parsed
  try { parsed = new URL(url) } catch { throw new BadRequestError("Webhook URL must be valid.") }
  if (parsed.protocol !== "https:") throw new BadRequestError("Webhook URL must use HTTPS.")
  if (parsed.username || parsed.password) throw new BadRequestError("Webhook URL must not contain credentials.")
  if (parsed.port && !["443", "8443"].includes(parsed.port)) throw new BadRequestError("Webhook URL uses a disallowed port.")
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (hostname === "localhost" || hostname.endsWith(".localhost") || net.isIP(hostname) && isPrivateIp(hostname)) throw new BadRequestError("Webhook URL targets a private or loopback address.")
  try {
    const records = await dns.lookup(hostname, { all: true })
    if (!records.length || records.some(({ address }) => isPrivateIp(address))) throw new BadRequestError("Webhook URL resolves to a private or reserved address.")
  } catch (error) {
    if (error instanceof BadRequestError) throw error
    throw new BadRequestError("Webhook hostname could not be safely resolved.")
  }
  return parsed
}

const createEndpoint = async ({ key, name, url, events = [], integrationId = null, secretRef = null, headers = null }) => {
  if (!key || !name || !url) throw new BadRequestError("Webhook key, name, and URL are required.")
  await assertSafeWebhookUrl(url)
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
const getDueDeliveries = async (limit = 50) => prisma.webhookDelivery.findMany({ where: { status: "QUEUED", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, include: { endpoint: true }, orderBy: { createdAt: "asc" }, take: Math.min(Math.max(limit, 1), 100) })
const getDelivery = async (id) => {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id }, include: { endpoint: true } })
  if (!delivery) throw new NotFoundError(`Webhook delivery '${id}' was not found.`)
  return delivery
}

module.exports = { createEndpoint, queueEvent, signPayload, markSent, markFailed, getDueDeliveries, getDelivery, assertSafeWebhookUrl }
