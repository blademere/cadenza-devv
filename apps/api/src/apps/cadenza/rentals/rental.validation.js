import {z} from 'zod'
const createValidator=z.object({body:z.object({customerUserId:z.coerce.number().int().positive(),resourceId:z.string().uuid(),rentalType:z.string().trim().min(1).max(50),scheduledStart:z.coerce.date(),scheduledEnd:z.coerce.date(),totalAmount:z.coerce.number().positive(),requiredDownPayment:z.coerce.number().nonnegative(),currency:z.string().trim().length(3).default('PHP')})})
export {createValidator}
