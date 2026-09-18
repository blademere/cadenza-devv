import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const listPackages=(appId)=>prisma.cadenzaLessonPackage.findMany({where:{appId},include:{attachments:true},orderBy:{name:'asc'}})
const createPackage=(data)=>prisma.cadenzaLessonPackage.create({data,include:{attachments:true}})
const findStudent=(id,appId)=>prisma.cadenzaStudent.findFirst({where:{id,appId}})
const findPackage=(id,appId)=>prisma.cadenzaLessonPackage.findFirst({where:{id,appId}})
const createEnrollment=(data,db=prisma)=>db.cadenzaEnrollment.create({data})
const listEnrollments=(appId)=>prisma.cadenzaEnrollment.findMany({where:{appId},include:{lessonPackage:true},orderBy:{createdAt:'desc'}})
export {listPackages,createPackage,findStudent,findPackage,createEnrollment,listEnrollments}
