import { z } from 'zod'

const createValidator = z.object({
  body: z.object({
    key: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(255),
    type: z.enum(['CADENZA_INSTRUMENT', 'CADENZA_ROOM']),
    description: z.string().trim().max(2000).optional(),
  }),
})

export { createValidator }
