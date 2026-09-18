import {z} from 'zod'
const createValidator=z.object({body:z.object({userId:z.coerce.number().int().positive().nullable().optional(),personId:z.string().uuid().nullable().optional(),firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().min(1).max(100),specialty:z.string().trim().max(100).optional()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,idValidator}
