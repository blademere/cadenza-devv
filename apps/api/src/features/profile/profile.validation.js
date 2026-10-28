import { z } from 'zod'

const profileFields = {
  email: z.email().trim().toLowerCase().optional(),
  firstName: z.string().trim().min(1).max(100).regex(/^[A-Z][A-Za-z]*(?:[ '-][A-Z][A-Za-z]*)*$/, 'Name must start with a capital letter.'),
  middleName: z.string().trim().max(100).regex(/^[A-Z][A-Za-z]*(?:[ '-][A-Z][A-Za-z]*)*$/, 'Name must start with a capital letter.').nullable().optional(),
  lastName: z.string().trim().min(1).max(100).regex(/^[A-Z][A-Za-z]*(?:[ '-][A-Z][A-Za-z]*)*$/, 'Name must start with a capital letter.'),
  suffix: z.string().trim().max(30).nullable().optional(),
  phone: z.string().trim().regex(/^(09\d{9}|\+639\d{9})$/, 'Phone number must be a valid Philippine mobile number.').nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  age: z.coerce.number().int().min(1).max(120).nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'PREFER_NOT_TO_SAY']).nullable().optional(),
  guardianName: z.string().trim().max(200).regex(/^[A-Z][A-Za-z]*(?:[ '-][A-Z][A-Za-z]*)*$/, 'Name must start with a capital letter.').nullable().optional(),
}

const createMyProfileSchema = z.object({
  body: z.object(profileFields),
})

const updateMyProfileSchema = z.object({
  body: z.object(profileFields).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one profile field is required.',
  }),
})

const updateMyPasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(8).optional(), password: z.string().min(8).max(128) }),
})

const createMyProfileValidator = async (req) =>
  createMyProfileSchema.parse({ body: req.body || {} })

const updateMyProfileValidator = async (req) =>
  updateMyProfileSchema.parse({ body: req.body || {} })

const updateMyPasswordValidator = async (req) =>
  updateMyPasswordSchema.parse({ body: req.body || {} })

export {
  createMyProfileValidator,
  updateMyProfileValidator,
  updateMyPasswordValidator,
}
