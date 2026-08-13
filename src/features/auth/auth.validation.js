const { z } = require("zod")

const loginSchema = z.object({
  body: z.object({
    email: z.email().trim().toLowerCase(),

    password: z.string().min(8),
  }),
})

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20),
  }),
})

const loginValidator = async (req) => {
  return loginSchema.parse({
    body: req.body || {},
  })
}

const refreshTokenValidator = async (req) => {
  return refreshTokenSchema.parse({
    body: req.body || {},
  })
}

module.exports = {
  loginValidator,
  refreshTokenValidator,
}
