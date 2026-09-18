import { Prisma } from '@prisma/client'
import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const withTransaction=async (callback,db=prisma) => {
  if (db !== prisma) return db.$transaction(callback)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === 2) throw error
    }
  }
}
const list=(appId,db=prisma)=>db.cadenzaRental.findMany({where:{appId},orderBy:{createdAt:'desc'}})
const create=(data,db=prisma)=>db.cadenzaRental.create({data})
const findResource=(id,appId,db=prisma)=>db.resource.findFirst({where:{id,appId,status:'ACTIVE'}})
const findInstrumentByResource=(resourceId,appId,db=prisma)=>db.cadenzaInstrument.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findRoomByResource=(resourceId,appId,db=prisma)=>db.cadenzaRoom.findFirst({where:{resourceId,appId,status:'AVAILABLE'}})
const findById=(id,appId,db=prisma)=>db.cadenzaRental.findFirst({where:{id,appId}})
const attachPaymentObligation=(id,paymentObligationId,db=prisma)=>db.cadenzaRental.update({where:{id},data:{paymentObligationId}})
const reserve=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
const findOverlap=({appId,resourceId,scheduledStart,scheduledEnd,excludeId},db=prisma)=>db.cadenzaRental.findFirst({where:{appId,resourceId,status:{in:['RESERVED','CHECKED_OUT']},scheduledStart:{lt:scheduledEnd},scheduledEnd:{gt:scheduledStart},...(excludeId?{id:{not:excludeId}}:{})}})
const checkout=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'RESERVED'},data:{status:'CHECKED_OUT',checkedOutAt:new Date()}})
const returnRental=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'CHECKED_OUT'},data:{status:'RETURNED',returnedAt:new Date()}})
const cancel=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:{in:['PENDING','RESERVED']}},data:{status:'CANCELLED'}})
export {withTransaction,list,create,findResource,findInstrumentByResource,findRoomByResource,findById,attachPaymentObligation,reserve,findOverlap,checkout,returnRental,cancel}
