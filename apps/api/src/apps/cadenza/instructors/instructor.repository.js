import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const list=(appId)=>prisma.cadenzaInstructor.findMany({where:{appId},orderBy:[{lastName:'asc'},{firstName:'asc'}]})
const findById=(id,appId)=>prisma.cadenzaInstructor.findFirst({where:{id,appId}})
const create=(data)=>prisma.cadenzaInstructor.create({data})
export {list,findById,create}
