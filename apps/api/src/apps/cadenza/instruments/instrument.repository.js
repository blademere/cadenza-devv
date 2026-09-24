import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const hydrate = async (instrument, db = prisma) => {
  if (!instrument) return instrument
  const resource = await db.resource.findFirst({ where: { id: instrument.resourceId, appId: instrument.appId } })
  return { ...instrument, resource }
}
const list = async (appId, db = prisma) => {
  const rows = await db.cadenzaInstrument.findMany({ where: { appId }, orderBy: { createdAt: 'asc' } })
  return Promise.all(rows.map((row) => hydrate(row, db)))
}
const findById = async (id, appId, db = prisma) => hydrate(await db.cadenzaInstrument.findFirst({ where: { id, appId } }), db)
const create=(data)=>prisma.cadenzaInstrument.create({data})
const update=(id,appId,data)=>prisma.cadenzaInstrument.updateMany({where:{id,appId},data})
export {create,list,findById,update}
