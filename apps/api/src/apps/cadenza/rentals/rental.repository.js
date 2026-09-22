import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const list=(appId,db=prisma)=>db.cadenzaRental.findMany({where:{appId},orderBy:{createdAt:'desc'}})
const create=(data,db=prisma)=>db.cadenzaRental.create({data})
const findResource=(id,appId,db=prisma)=>db.resource.findFirst({where:{id,appId,status:'ACTIVE'}})
const findInstrumentByResource=(resourceId,appId,db=prisma)=>db.cadenzaInstrument.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findRoomByResource=(resourceId,appId,db=prisma)=>db.cadenzaRoom.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findById=(id,appId,db=prisma)=>db.cadenzaRental.findFirst({where:{id,appId}})
const attachPaymentObligation=(id,paymentObligationId,db=prisma)=>db.cadenzaRental.update({where:{id},data:{paymentObligationId}})
const reserve=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
const findOverlap=({appId,resourceId,scheduledStart,scheduledEnd,excludeId},db=prisma)=>db.cadenzaRental.findFirst({where:{appId,resourceId,status:{in:['PENDING','RESERVED','CHECKED_OUT']},scheduledStart:{lt:scheduledEnd},scheduledEnd:{gt:scheduledStart},...(excludeId?{id:{not:excludeId}}:{})}})
const checkout=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'RESERVED'},data:{status:'CHECKED_OUT',checkedOutAt:new Date()}})
const returnRental=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'CHECKED_OUT'},data:{status:'RETURNED',returnedAt:new Date()}})
const listAvailableResources = async ({ appId, rentalType, scheduledStart, scheduledEnd }, db = prisma) => {
  const type = rentalType === 'ROOM' ? 'CADENZA_ROOM' : 'CADENZA_INSTRUMENT'
  const domain = rentalType === 'ROOM'
    ? await db.cadenzaRoom.findMany({ where: { appId, status: 'AVAILABLE' }, include: { } })
    : await db.cadenzaInstrument.findMany({ where: { appId, status: 'AVAILABLE' }, include: { } })
  const available = []
  for (const item of domain) {
    const resource = await db.resource.findFirst({ where: { id: item.resourceId, appId, type, status: 'ACTIVE' } })
    if (!resource) continue
    const rentalOverlap = await findOverlap({ appId, resourceId: item.resourceId, scheduledStart, scheduledEnd }, db)
    if (rentalOverlap) continue
    if (rentalType === 'ROOM') {
      const lessonOverlap = await findLessonSessionOverlap({ appId, roomId: item.id, scheduledStart, scheduledEnd }, db)
      if (lessonOverlap) continue
    }
    available.push({ resource, domain: item })
  }
  return available
}
const findLessonSessionOverlap = ({ appId, roomId, scheduledStart, scheduledEnd }, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { appId, roomId, status: { not: 'CANCELLED' }, scheduledStart: { lt: scheduledEnd }, scheduledEnd: { gt: scheduledStart } } })
const cancel=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:{in:['PENDING','RESERVED']}},data:{status:'CANCELLED'}})
export {list,create,findResource,findInstrumentByResource,findRoomByResource,findById,attachPaymentObligation,reserve,findOverlap,findLessonSessionOverlap,listAvailableResources,checkout,returnRental,cancel}
