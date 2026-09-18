import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const list=(appId)=>prisma.cadenzaRental.findMany({where:{appId},orderBy:{createdAt:'desc'}})
const create=(data,db=prisma)=>db.cadenzaRental.create({data})
const findResource=(id,appId)=>prisma.resource.findFirst({where:{id,appId}})
export {list,create,findResource}
