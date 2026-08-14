const { z } = require('zod')

const loginSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),

    password: z.string().min(8).max(72),
  }),
})

const loginValidator = async (req) => {
  return loginSchema.parse({
    body: req.body || {},
  })
}

module.exports = {
  loginValidator,
}
