import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/)
const actionSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/)

const createModuleSchema = z.object({
  body: z.object({
    key: keySchema,
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).optional(),
  }),
})

const createPermissionSchema = z.object({
  params: z.object({ moduleId: z.coerce.number().int().positive() }),
  body: z.object({ action: actionSchema }),
})

const setModuleActiveSchema = z.object({
  params: z.object({ moduleId: z.coerce.number().int().positive() }),
  body: z.object({ isActive: z.boolean() }),
})

const replaceRolePermissionsSchema = z.object({
  params: z.object({ roleId: z.coerce.number().int().positive() }),
  body: z.object({
    permissionIds: z.array(z.coerce.number().int().positive()).max(500),
  }),
})

const validate = (schema) => async (req) => schema.parse({
  body: req.body || {},
  params: req.params || {},
})

export {
  createModuleValidator: validate(createModuleSchema),
  createPermissionValidator: validate(createPermissionSchema),
  setModuleActiveValidator: validate(setModuleActiveSchema),
  replaceRolePermissionsValidator: validate(replaceRolePermissionsSchema),
}
