const { z } = require("zod");
const { AUTH_ROLE_VALUES } = require("../auth/auth.constants");

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email(),
    role: z.enum(AUTH_ROLE_VALUES),
    password: z.string().min(8).max(72),
  }),
});

const listUsersValidator = async (req) => {
  return listUsersSchema.parse({ query: req.query || {} });
};

const createUserValidator = async (req) => {
  return createUserSchema.parse({ body: req.body || {} });
};

module.exports = {
  listUsersValidator,
  createUserValidator,
};
