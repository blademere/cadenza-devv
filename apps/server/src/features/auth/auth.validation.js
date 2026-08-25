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

const loginValidator = async (req) => loginSchema.parse({ body: req.body || {} })
const registrationValidator = async (req) => registrationSchema.parse({ body: req.body || {} })

module.exports = { loginValidator, registrationValidator }
