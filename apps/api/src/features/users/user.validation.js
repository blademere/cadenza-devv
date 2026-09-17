import { z } from 'zod'

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'email', 'isActive'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    email: z.string().trim().max(320).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
})

const createUserSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(72),
  }),
})

const listUsersValidator = async (req) =>
  listUsersSchema.parse({ query: req.query || {} })

const createUserValidator = async (req) =>
  createUserSchema.parse({ body: req.body || {} })

export {
  listUsersValidator,
  createUserValidator,
}
