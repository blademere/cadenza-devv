import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const personSelect={id:true,firstName:true,middleName:true,lastName:true,suffix:true,email:true,phone:true,isActive:true}
const findPersonByUserId=(userId)=>prisma.person.findUnique({where:{userId},select:{id:true}})
const personExists=(personId)=>prisma.person.findUnique({where:{id:personId},select:{id:true}})
const findById=(id,appId)=>prisma.cadenzaStudent.findFirst({where:{id,appId},include:{person:{select:personSelect}}})
const list=(appId)=>prisma.cadenzaStudent.findMany({where:{appId},include:{person:{select:personSelect}},orderBy:{createdAt:'desc'}})
const create=(data)=>prisma.cadenzaStudent.create({data,include:{person:{select:personSelect}}})
export {findById,list,create,personExists,findPersonByUserId}
