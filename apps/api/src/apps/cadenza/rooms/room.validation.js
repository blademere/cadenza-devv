import { z } from 'zod'

const createSchema = z.object({ body: z.object({ resourceId: z.string().uuid(), roomType: z.string().trim().min(1).max(100), capacity: z.coerce.number().int().positive(), rentalRate: z.coerce.number().positive() }) })
const updateSchema = z.object({ params: z.object({ id: z.string().uuid() }), body: z.object({ roomType: z.string().trim().min(1).max(100).optional(), capacity: z.coerce.number().int().positive().optional(), rentalRate: z.coerce.number().positive().optional(), status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'RETIRED']).optional() }) })
const idSchema = z.object({ params: z.object({ id: z.string().uuid() }) })

const createValidator = async (req) => createSchema.parse({ body: req.body || {} })
const updateValidator = async (req) => updateSchema.parse({ params: req.params || {}, body: req.body || {} })
const idValidator = async (req) => idSchema.parse({ params: req.params || {} })

export { createValidator, updateValidator, idValidator }
