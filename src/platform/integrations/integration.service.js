const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")

const createIntegration = async ({ key, name, type, config = null, secretRef = null }) => {
  if (!key || !name || !type) throw new BadRequestError("Integration key, name, and type are required.")
  if (await prisma.integration.findUnique({ where: { key } })) throw new ConflictError(`Integration '${key}' already exists.`)
  return prisma.integration.create({ data: { key, name, type, config, secretRef } })
}

const subscribeEvent = async ({ integrationKey, event, config = null }) => {
  if (!event) throw new BadRequestError("Integration event is required.")
  const integration = await prisma.integration.findUnique({ where: { key: integrationKey } })
  if (!integration || !integration.active) throw new NotFoundError(`Active integration '${integrationKey}' was not found.`)
  return prisma.integrationEvent.upsert({ where: { integrationId_event: { integrationId: integration.id, event } }, create: { integrationId: integration.id, event, config }, update: { active: true, config } })
}

const getActiveSubscribers = async (event) => prisma.integrationEvent.findMany({ where: { event, active: true, integration: { active: true } }, include: { integration: true } })

module.exports = { createIntegration, subscribeEvent, getActiveSubscribers }
