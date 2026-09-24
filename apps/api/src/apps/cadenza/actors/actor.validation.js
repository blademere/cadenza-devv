import { z } from 'zod'

const listActorsValidator = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(255).optional(),
  }),
})

const actorParamsValidator = z.object({
  params: z.object({ userId: z.coerce.number().int().positive() }),
})

export { listActorsValidator, actorParamsValidator }
