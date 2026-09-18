import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const list=(appId)=>prisma.cadenzaRoom.findMany({where:{appId},orderBy:{createdAt:'asc'}})
const findById=(id,appId)=>prisma.cadenzaRoom.findFirst({where:{id,appId}})
const findByResource=(resourceId,appId)=>prisma.cadenzaRoom.findFirst({where:{resourceId,appId}})
const create=(data)=>prisma.cadenzaRoom.create({data})
export {list,findById,findByResource,create}
