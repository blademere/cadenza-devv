import { z } from 'zod'

const keySchema = z.string().trim().min(1).max(100).regex(/^obo_[a-z0-9][a-z0-9_-]*$/)
const actionSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/)
const id = z.coerce.number().int().positive()
const membershipId = z.string().uuid()

const createModuleValidator = async (req) => z.object({ body: z.object({ key: keySchema, name: z.string().trim().min(1).max(150), description: z.string().trim().max(500).optional() }) }).parse({ body: req.body || {} })
const createPermissionValidator = async (req) => z.object({ params: z.object({ moduleId: id }), body: z.object({ action: actionSchema }) }).parse({ params: req.params || {}, body: req.body || {} })
const setModuleActiveValidator = async (req) => z.object({ params: z.object({ moduleId: id }), body: z.object({ isActive: z.boolean() }) }).parse({ params: req.params || {}, body: req.body || {} })
const createRoleValidator = async (req) => z.object({ body: z.object({ membershipId, name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional() }) }).parse({ body: req.body || {} })
const roleParamsValidator = async (req) => z.object({ params: z.object({ roleId: id }) }).parse({ params: req.params || {} })
const replaceRolePermissionsValidator = async (req) => z.object({ params: z.object({ roleId: id }), body: z.object({ permissionIds: z.array(id).max(500) }) }).parse({ params: req.params || {}, body: req.body || {} })
const membershipParamsValidator = async (req) => z.object({ params: z.object({ membershipId }) }).parse({ params: req.params || {} })
const membershipRolesValidator = async (req) => z.object({ params: z.object({ membershipId }), body: z.object({ roleIds: z.array(id).max(100) }) }).parse({ params: req.params || {}, body: req.body || {} })

export { createModuleValidator, createPermissionValidator, setModuleActiveValidator, createRoleValidator, roleParamsValidator, replaceRolePermissionsValidator, membershipParamsValidator, membershipRolesValidator }
