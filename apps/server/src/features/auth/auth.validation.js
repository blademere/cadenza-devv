const { z } = require('zod')

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

const sessionIdSchema = z.object({
  params: z.object({
    id: z.uuid(),
  }),
})

const loginValidator = async (req) => loginSchema.parse({ body: req.body || {} })
const registrationValidator = async (req) => registrationSchema.parse({ body: req.body || {} })
const passwordChangeValidator = async (req) => passwordChangeSchema.parse({ body: req.body || {} })
const sessionIdValidator = async (req) => sessionIdSchema.parse({ params: req.params || {} })

module.exports = { loginValidator, registrationValidator, passwordChangeValidator, sessionIdValidator }
