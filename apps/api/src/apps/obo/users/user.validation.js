import { z } from 'zod'

const assignUserRoleSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int().positive(),
  }),
  body: z.object({
    roleId: z.coerce.number().int().positive(),
  }),
})

const assignUserRoleValidator = async (req) =>
  assignUserRoleSchema.parse({
    params: req.params || {},
    body: req.body || {},
  })

export {
  assignUserRoleValidator,
}
