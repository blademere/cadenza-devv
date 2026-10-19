import { z } from 'zod'

const profileFields = {
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100),
  suffix: z.string().trim().max(30).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  age: z.coerce.number().int().min(1).max(120).nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'PREFER_NOT_TO_SAY']).nullable().optional(),
  guardianName: z.string().trim().max(200).nullable().optional(),
}

const createMyProfileSchema = z.object({
  body: z.object(profileFields),
})

const updateMyProfileSchema = z.object({
  body: z.object(profileFields).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one profile field is required.',
  }),
})

const createMyProfileValidator = async (req) =>
  createMyProfileSchema.parse({ body: req.body || {} })

const updateMyProfileValidator = async (req) =>
  updateMyProfileSchema.parse({ body: req.body || {} })

export {
  createMyProfileValidator,
  updateMyProfileValidator,
}
