const { z } = require("zod")

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
})

const createUserSchema = z.object({
  body: z.object({
    email: z.email(),

    roleId: z.coerce.number().int().positive(),

    password: z.string().min(8).max(72),
  }),
})

const listUsersValidator = async (req) => {
  return listUsersSchema.parse({
    query: req.query || {},
  })
}

const createUserValidator = async (req) => {
  return createUserSchema.parse({
    body: req.body || {},
  })
}

module.exports = {
  listUsersValidator,
  createUserValidator,
}
