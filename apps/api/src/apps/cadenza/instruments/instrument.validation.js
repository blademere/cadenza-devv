import {z} from 'zod'
const createValidator=z.object({body:z.object({resourceId:z.string().uuid(),instrumentType:z.string().trim().min(1).max(100),brand:z.string().trim().max(100).optional(),model:z.string().trim().max(100).optional(),serialNumber:z.string().trim().max(100).optional(),rentalRate:z.coerce.number().positive()})})
const updateValidator=z.object({params:z.object({id:z.string().uuid()}),body:z.object({instrumentType:z.string().trim().min(1).max(100).optional(),brand:z.string().trim().max(100).nullable().optional(),model:z.string().trim().max(100).nullable().optional(),serialNumber:z.string().trim().max(100).nullable().optional(),rentalRate:z.coerce.number().positive().optional(),status:z.enum(['AVAILABLE','UNAVAILABLE','MAINTENANCE','RETIRED']).optional()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,updateValidator,idValidator}
