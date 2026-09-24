import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const hydrate = async (room, db = prisma) => {
  if (!room) return room
  const resource = await db.resource.findFirst({ where: { id: room.resourceId, appId: room.appId } })
  return { ...room, resource }
}
const list = async (appId, db = prisma) => {
  const rows = await db.cadenzaRoom.findMany({ where: { appId }, orderBy: { createdAt: 'asc' } })
  return Promise.all(rows.map((row) => hydrate(row, db)))
}
const findById = async (id, appId, db = prisma) => hydrate(await db.cadenzaRoom.findFirst({ where: { id, appId } }), db)
const findByResource=(resourceId,appId)=>prisma.cadenzaRoom.findFirst({where:{resourceId,appId}})
const create=(data)=>prisma.cadenzaRoom.create({data})
const update=(id,appId,data)=>prisma.cadenzaRoom.updateMany({where:{id,appId},data})
export {create,list,findById,findByResource,update}
