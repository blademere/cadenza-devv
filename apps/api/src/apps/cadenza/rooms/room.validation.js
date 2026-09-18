import {z} from 'zod'
const createValidator=z.object({body:z.object({resourceId:z.string().uuid(),roomType:z.string().trim().min(1).max(100),capacity:z.coerce.number().int().positive(),rentalRate:z.coerce.number().positive()})})
const idValidator=z.object({params:z.object({id:z.string().uuid()})})
export {createValidator,idValidator}
