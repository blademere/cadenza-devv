import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const findRental=(id,appId)=>prisma.cadenzaRental.findFirst({where:{id,appId}})
const confirmEnrollment=(id,appId)=>prisma.cadenzaEnrollment.updateMany({where:{id,appId,status:'PENDING_PAYMENT'},data:{status:'CONFIRMED',enrolledAt:new Date()}})
const reserveRental=(id,appId)=>prisma.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
export {findRental,confirmEnrollment,reserveRental}
