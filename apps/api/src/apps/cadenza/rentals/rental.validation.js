import {z} from 'zod'
const money=z.union([z.number().finite().positive(),z.string().trim().regex(/^\d+(?:\.\d+)?$/,'must be a positive decimal amount')])
const availabilityValidator=z.object({query:z.object({rentalType:z.enum(['INSTRUMENT','ROOM']),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime()})})
const createValidator=z.object({body:z.object({customerId:z.string().uuid().optional(),resourceId:z.string().uuid(),rentalType:z.enum(['INSTRUMENT','ROOM']),scheduledStart:z.string().datetime(),scheduledEnd:z.string().datetime(),totalAmount:money,requiredDownPayment:money,currency:z.string().length(3).default('PHP')})})
export {createValidator,availabilityValidator}
