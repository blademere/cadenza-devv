import {z} from 'zod'
const money=z.union([z.number().finite().positive(),z.string().trim().regex(/^\d+(?:\.\d+)?$/,'must be a positive decimal amount')])
const getValidator=z.object({params:z.object({obligationId:z.string().uuid()})})
const checkoutValidator=z.object({params:z.object({obligationId:z.string().uuid()}),body:z.object({amount:money,description:z.string().trim().max(255).optional()})})
const refundValidator=z.object({params:z.object({paymentId:z.string().uuid()}),body:z.object({amount:money,currency:z.string().trim().length(3).optional(),reason:z.string().trim().max(500).optional()})})
const payValidator=z.object({params:z.object({obligationId:z.string().uuid()}),body:z.object({amount:money,currency:z.string().trim().length(3),method:z.string().trim().max(50).optional(),provider:z.string().trim().max(100).optional(),providerReference:z.string().trim().max(255).optional(),metadata:z.record(z.string(),z.any()).optional()})})
export {getValidator,payValidator,checkoutValidator,refundValidator}
