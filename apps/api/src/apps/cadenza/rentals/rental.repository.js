import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const withTransaction=(callback)=>prisma.$transaction(callback)
const list=(appId)=>prisma.cadenzaRental.findMany({where:{appId},orderBy:{createdAt:'desc'}})
const create=(data,db=prisma)=>db.cadenzaRental.create({data})
const findResource=(id,appId)=>prisma.resource.findFirst({where:{id,appId}})
const findById=(id,appId)=>prisma.cadenzaRental.findFirst({where:{id,appId}})
const attachPaymentObligation=(id,paymentObligationId,db=prisma)=>db.cadenzaRental.update({where:{id},data:{paymentObligationId}})
const reserve=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
export {withTransaction,list,create,findResource,findById,attachPaymentObligation,reserve}
