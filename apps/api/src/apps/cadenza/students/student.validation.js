import { z } from 'zod'
const createValidator=z.object({body:z.object({userId:z.coerce.number().int().positive(),personId:z.string().uuid().nullable().optional(),firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().min(1).max(100),email:z.string().email().optional(),phone:z.string().trim().max(50).optional()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,idValidator}
