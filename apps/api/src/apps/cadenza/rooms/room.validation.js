import {z} from 'zod'
const createValidator=z.object({body:z.object({resourceId:z.string().uuid(),roomType:z.string().trim().min(1).max(100),capacity:z.coerce.number().int().positive(),rentalRate:z.coerce.number().positive()})})
const updateValidator=z.object({params:z.object({id:z.string().uuid()}),body:z.object({roomType:z.string().trim().min(1).max(100).optional(),capacity:z.coerce.number().int().positive().optional(),rentalRate:z.coerce.number().positive().optional(),status:z.enum(['AVAILABLE','UNAVAILABLE','RETIRED']).optional()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,updateValidator,idValidator}
