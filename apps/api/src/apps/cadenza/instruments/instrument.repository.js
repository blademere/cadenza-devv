import {getPrismaClient} from '../../../infrastructure/database/prisma.js'
const prisma=getPrismaClient()
const list=(appId)=>prisma.cadenzaInstrument.findMany({where:{appId},orderBy:{createdAt:'asc'}})
const findById=(id,appId)=>prisma.cadenzaInstrument.findFirst({where:{id,appId}})
const create=(data)=>prisma.cadenzaInstrument.create({data})
const update=(id,appId,data)=>prisma.cadenzaInstrument.updateMany({where:{id,appId},data})
export {create,list,findById,update}
