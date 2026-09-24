import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const personSelect={id:true,userId:true,firstName:true,middleName:true,lastName:true,suffix:true,email:true,phone:true,isActive:true}
const personExists=(personId)=>prisma.person.findUnique({where:{id:personId},select:{id:true}})
const findEligiblePerson=(personId,appId)=>prisma.person.findFirst({where:{id:personId,isActive:true,userId:{not:null},cadenzaInstructors:{none:{appId}}},select:personSelect})
const listCandidates=(appId)=>prisma.person.findMany({where:{isActive:true,userId:{not:null},...cadenzaMemberWhere(appId),cadenzaInstructors:{none:{appId}}},select:personSelect,orderBy:[{lastName:'asc'},{firstName:'asc'}]})
const list=(appId)=>prisma.cadenzaInstructor.findMany({where:{appId},include:{person:{select:personSelect}},orderBy:{createdAt:'desc'}})
const findByActor=(userId,appId)=>prisma.cadenzaInstructor.findFirst({where:{appId,person:{userId:Number(userId)}},include:{person:{select:personSelect}}})
const findById=(id,appId)=>prisma.cadenzaInstructor.findFirst({where:{id,appId},include:{person:{select:personSelect}}})
const create=async(data)=>prisma.$transaction(async(tx)=>{
  const person=await tx.person.findUnique({where:{id:data.personId},select:{userId:true}})
  if(!person?.userId)return null
  await tx.appMembership.upsert({where:{appId_userId:{appId:data.appId,userId:person.userId}},update:{isActive:true},create:{appId:data.appId,userId:person.userId}})
  return tx.cadenzaInstructor.create({data,include:{person:{select:personSelect}}})
})
const update=(id,appId,data)=>prisma.cadenzaInstructor.updateMany({where:{id,appId},data})
export {list,listCandidates,findById,findByActor,create,personExists,findEligiblePerson,update}
