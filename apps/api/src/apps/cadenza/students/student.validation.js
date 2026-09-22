import { z } from 'zod'
const createValidator=z.object({body:z.object({personId:z.string().uuid()})})
const updateValidator=z.object({params:z.object({id:z.string().uuid()}),body:z.object({status:z.enum(['ACTIVE','INACTIVE'])})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,updateValidator,idValidator}
