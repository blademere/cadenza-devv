import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const withTransaction=(callback)=>prisma.$transaction(callback)
const listPackages=(appId)=>prisma.cadenzaLessonPackage.findMany({where:{appId},include:{attachments:true},orderBy:{name:'asc'}})
const createPackage=(data)=>prisma.cadenzaLessonPackage.create({data,include:{attachments:true}})
const findStudent=(id,appId)=>prisma.cadenzaStudent.findFirst({where:{id,appId}})
const findPackage=(id,appId)=>prisma.cadenzaLessonPackage.findFirst({where:{id,appId}})
const createEnrollment=(data,db=prisma)=>db.cadenzaEnrollment.create({data})
const attachPaymentObligation=(id,appId,paymentObligationId,db=prisma)=>db.cadenzaEnrollment.update({where:{id},data:{paymentObligationId},include:{lessonPackage:true}})
const listEnrollments=(appId)=>prisma.cadenzaEnrollment.findMany({where:{appId},include:{lessonPackage:true},orderBy:{createdAt:'desc'}})
const confirmEnrollment=(id,appId,db=prisma)=>db.cadenzaEnrollment.updateMany({where:{id,appId},data:{status:'CONFIRMED',enrolledAt:new Date()}})
export {withTransaction,listPackages,createPackage,findStudent,findPackage,createEnrollment,attachPaymentObligation,listEnrollments,confirmEnrollment}
