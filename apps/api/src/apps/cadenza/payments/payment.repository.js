import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const findEnrollment=(id,appId,db=prisma)=>db.cadenzaEnrollment.findFirst({where:{id,appId},include:{student:{include:{person:true}}}})
const findRental=(id,appId,db=prisma)=>db.cadenzaRental.findFirst({where:{id,appId},include:{customer:{include:{person:true}}}})
const confirmEnrollment=(id,appId,db=prisma)=>db.cadenzaEnrollment.updateMany({where:{id,appId,status:'PENDING_PAYMENT'},data:{status:'CONFIRMED',enrolledAt:new Date()}})
const reserveRental=(id,appId,db=prisma)=>db.cadenzaRental.updateMany({where:{id,appId,status:'PENDING'},data:{status:'RESERVED'}})
export {findRental,findEnrollment,confirmEnrollment,reserveRental}
