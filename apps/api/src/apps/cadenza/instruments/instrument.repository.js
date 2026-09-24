import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const enrich = async (rows, appId, db = prisma) => {
  const ids = rows.map((row) => row.resourceId).filter(Boolean)
  const resources = ids.length ? await db.resource.findMany({ where: { appId, id: { in: ids } } }) : []
  const byId = new Map(resources.map((resource) => [resource.id, resource]))
  return rows.map((row) => ({ ...row, resource: byId.get(row.resourceId) ?? null }))
}

const list = async (appId, db = prisma) => enrich(
  await db.cadenzaInstrument.findMany({ where: { appId }, orderBy: { createdAt: 'asc' } }),
  appId,
  db,
)
const findById = async (id, appId, db = prisma) => {
  const row = await db.cadenzaInstrument.findFirst({ where: { id, appId } })
  if (!row) return null
  const [value] = await enrich([row], appId, db)
  return value
}
const create = (data, db = prisma) => db.cadenzaInstrument.create({ data })
const update = (id, appId, data, db = prisma) => db.cadenzaInstrument.updateMany({ where: { id, appId }, data })
export { create, list, findById, update }
