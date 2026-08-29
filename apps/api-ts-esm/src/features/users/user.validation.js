const { z } = require("zod")

const listUsersSchema = z.object({ query: z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "email", "isActive"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  email: z.string().trim().max(320).optional(),
  isActive: z.enum(["true", "false"]).optional(),
}) })

const createUserSchema = z.object({ body: z.object({
  email: z.email().trim().toLowerCase(), roleId: z.coerce.number().int().positive(), password: z.string().min(8).max(72),
}) })

const assignUserRoleSchema = z.object({ params: z.object({ userId: z.coerce.number().int().positive() }), body: z.object({ roleId: z.coerce.number().int().positive() }) })

const listUsersValidator = async (req) => listUsersSchema.parse({ query: req.query || {} })
const createUserValidator = async (req) => createUserSchema.parse({ body: req.body || {} })
const assignUserRoleValidator = async (req) => assignUserRoleSchema.parse({ params: req.params || {}, body: req.body || {} })

module.exports = { listUsersValidator, createUserValidator, assignUserRoleValidator }
