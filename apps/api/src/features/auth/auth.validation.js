import { z } from 'zod'

const loginSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(72),
  }),
})
const registrationSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(72),
  }),
})
const passwordChangeSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  }),
})
const passwordResetRequestSchema = z.object({
  body: z.object({ email: z.email().trim().toLowerCase() }),
})
const passwordResetSchema = z.object({
  body: z.object({
    token: z.string().min(32).max(128),
    newPassword: z.string().min(8).max(72),
  }),
})
const emailVerificationSchema = z.object({
  body: z.object({ token: z.string().min(32).max(128) }),
})
const sessionIdSchema = z.object({ params: z.object({ id: z.uuid() }) })
const profileText = (max) => z.string().trim().max(max).optional().nullable()
const selfProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).max(100),
    middleName: profileText(100),
    lastName: z.string().trim().min(1).max(100),
    suffix: profileText(30),
    phone: profileText(30),
    address: z.record(z.string(), z.unknown()).optional().nullable(),
  }).strict(),
})
const loginValidator = async (req) => loginSchema.parse({ body: req.body || {} })
const registrationValidator = async (req) => registrationSchema.parse({ body: req.body || {} })
const passwordChangeValidator = async (req) => passwordChangeSchema.parse({ body: req.body || {} })
const passwordResetRequestValidator = async (req) => passwordResetRequestSchema.parse({ body: req.body || {} })
const passwordResetValidator = async (req) => passwordResetSchema.parse({ body: req.body || {} })
const emailVerificationValidator = async (req) => emailVerificationSchema.parse({ body: req.body || {} })
const sessionIdValidator = async (req) => sessionIdSchema.parse({ params: req.params || {} })
const selfProfileValidator = async (req) => selfProfileSchema.parse({ body: req.body || {} })

export { loginValidator, registrationValidator, passwordChangeValidator, passwordResetRequestValidator, passwordResetValidator, emailVerificationValidator, sessionIdValidator, selfProfileValidator }