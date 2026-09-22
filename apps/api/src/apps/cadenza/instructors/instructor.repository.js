import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const personSelect={id:true,firstName:true,middleName:true,lastName:true,suffix:true,email:true,phone:true,isActive:true}
const personExists=(personId)=>prisma.person.findUnique({where:{id:personId},select:{id:true}})
const list=(appId)=>prisma.cadenzaInstructor.findMany({where:{appId},include:{person:{select:personSelect}},orderBy:{createdAt:'desc'}})
const findByActor=(userId,appId)=>prisma.cadenzaInstructor.findFirst({where:{appId,person:{userId:Number(userId)}},include:{person:{select:personSelect}}})
const findById=(id,appId)=>prisma.cadenzaInstructor.findFirst({where:{id,appId},include:{person:{select:personSelect}}})
const create=(data)=>prisma.cadenzaInstructor.create({data,include:{person:{select:personSelect}}})
const update=(id,appId,data)=>prisma.cadenzaInstructor.updateMany({where:{id,appId},data})
export {list,findById,findByActor,create,personExists,update}
