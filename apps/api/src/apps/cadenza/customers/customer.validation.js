import { z } from 'zod'

const createValidator = async (req) => z.object({
  body: z.object({ personId: z.string().uuid() }),
}).parse({ body: req.body || {} })

const updateValidator = async (req) => z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }),
}).parse({ params: req.params, body: req.body || {} })

const idValidator = async (req) => z.object({
  params: z.object({ id: z.string().uuid() }),
}).parse({ params: req.params })

export { createValidator, updateValidator, idValidator }
