import {z} from 'zod'
const createValidator=z.object({body:z.object({personId:z.string().uuid(),specialty:z.string().trim().max(100).optional()})})
const updateValidator=z.object({params:z.object({id:z.string().uuid()}),body:z.object({specialty:z.string().trim().max(100).nullable().optional(),status:z.enum(['ACTIVE','INACTIVE']).optional()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,updateValidator,idValidator}
