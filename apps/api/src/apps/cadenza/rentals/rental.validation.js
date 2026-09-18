import {z} from 'zod'
const createValidator=z.object({body:z.object({customerUserId:z.coerce.number().int().positive(),resourceId:z.string().uuid(),rentalType:z.string().trim().min(1),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime(),totalAmount:z.coerce.number().positive(),requiredDownPayment:z.coerce.number().min(0),currency:z.string().length(3).default('PHP')})})
export {createValidator}
