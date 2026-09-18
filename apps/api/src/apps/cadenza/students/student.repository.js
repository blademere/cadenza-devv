import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const findById=(id,appId)=>prisma.cadenzaStudent.findFirst({where:{id,appId}})
const list=(appId)=>prisma.cadenzaStudent.findMany({where:{appId},orderBy:[{lastName:'asc'},{firstName:'asc'}]})
const create=(data)=>prisma.cadenzaStudent.create({data})
export {findById,list,create}
