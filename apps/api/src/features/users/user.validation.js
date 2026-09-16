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

const profileFields = {
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100),
  suffix: z.string().trim().max(30).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
}

const createMyProfileSchema = z.object({
  body: z.object(profileFields),
})

const updateMyProfileSchema = z.object({
  body: z.object(profileFields).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one profile field is required.',
  }),
})

const listUsersValidator = async (req) =>
  listUsersSchema.parse({ query: req.query || {} })
const createUserValidator = async (req) =>
  createUserSchema.parse({ body: req.body || {} })
const createMyProfileValidator = async (req) =>
  createMyProfileSchema.parse({ body: req.body || {} })
const updateMyProfileValidator = async (req) =>
  updateMyProfileSchema.parse({ body: req.body || {} })

export {
  listUsersValidator,
  createUserValidator,
  createMyProfileValidator,
  updateMyProfileValidator,
}
