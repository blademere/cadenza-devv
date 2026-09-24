import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { BLOCKING_LESSON_SESSION_STATUSES, BLOCKING_RENTAL_STATUSES } from '../cadenza.constants.js'
const prisma=getPrismaClient()
const list = async (appId, db = prisma) => {
  const rows = await db.cadenzaRental.findMany({ where: { appId }, orderBy: { createdAt: 'desc' }, include: { customer: { include: { person: true } } } })
  return Promise.all(rows.map(async (rental) => ({
    ...rental,
    resource: await db.resource.findFirst({ where: { id: rental.resourceId, appId } }),
  })))
}
const create=(data,db=prisma)=>db.cadenzaRental.create({data,include:{customer:{include:{person:true}}}})
const findCustomerById=(id,appId,db=prisma)=>db.cadenzaCustomer.findFirst({where:{id,appId,status:'ACTIVE',person:{isActive:true}},include:{person:true}})
const findCustomerByUserId=(userId,appId,db=prisma)=>db.cadenzaCustomer.findFirst({where:{appId,status:'ACTIVE',person:{isActive:true,userId:Number(userId)}},include:{person:true}})
const findResource=(id,appId,db=prisma)=>db.resource.findFirst({where:{id,appId,status:'ACTIVE'}})
const findInstrumentByResource=(resourceId,appId,db=prisma)=>db.cadenzaInstrument.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findRoomByResource=(resourceId,appId,db=prisma)=>db.cadenzaRoom.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findById=(id,appId,db=prisma)=>db.cadenzaRental.findFirst({where:{id,appId},include:{customer:{include:{person:true}}}})
const findDetails = async (id, appId, db = prisma) => {
  const rental = await db.cadenzaRental.findFirst({
    where: { id, appId },
    include: { customer: { include: { person: true } } },
  })
  if (!rental) return null
  const [resource, instrument, room] = await Promise.all([
    db.resource.findFirst({ where: { id: rental.resourceId, appId } }),
    rental.rentalType === 'INSTRUMENT'
      ? db.cadenzaInstrument.findFirst({ where: { resourceId: rental.resourceId, appId } })
      : null,
    rental.rentalType === 'ROOM'
      ? db.cadenzaRoom.findFirst({ where: { resourceId: rental.resourceId, appId } })
      : null,
  ])
  return { ...rental, resource, instrument, room }
}
const attachPaymentObligation=(id,paymentObligationId,db=prisma)=>db.cadenzaRental.update({where:{id},data:{paymentObligationId}})
const reserve=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
const findOverlap=({appId,resourceId,scheduledStart,scheduledEnd,excludeId},db=prisma)=>db.cadenzaRental.findFirst({where:{appId,resourceId,status:{in:BLOCKING_RENTAL_STATUSES},scheduledStart:{lt:scheduledEnd},scheduledEnd:{gt:scheduledStart},...(excludeId?{id:{not:excludeId}}:{})}})
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
const findLessonSessionOverlap = ({ appId, roomId, scheduledStart, scheduledEnd }, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { appId, roomId, status: { in: BLOCKING_LESSON_SESSION_STATUSES }, scheduledStart: { lt: scheduledEnd }, scheduledEnd: { gt: scheduledStart } } })
const cancel=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:{in:['PENDING','RESERVED']}},data:{status:'CANCELLED'}})
export {list,create,findCustomerById,findCustomerByUserId,findResource,findInstrumentByResource,findRoomByResource,findById,findDetails,attachPaymentObligation,reserve,findOverlap,findLessonSessionOverlap,listAvailableResources,checkout,returnRental,cancel}
