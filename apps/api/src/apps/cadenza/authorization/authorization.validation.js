import { z } from 'zod'
const createModuleValidator=z.object({body:z.object({key:z.string().trim().min(1).max(100),name:z.string().trim().min(1).max(255),description:z.string().trim().max(1000).nullable().optional()})})
const createPermissionValidator=z.object({params:z.object({moduleId:z.coerce.number().int().positive()}),body:z.object({action:z.string().trim().min(1).max(100)})})
const setModuleActiveValidator=z.object({params:z.object({moduleId:z.coerce.number().int().positive()}),body:z.object({isActive:z.boolean()})})
const createRoleValidator=z.object({body:z.object({membershipId:z.string().uuid(),name:z.string().trim().min(1).max(255),description:z.string().trim().max(1000).nullable().optional()})})
const roleParamsValidator=z.object({params:z.object({roleId:z.coerce.number().int().positive()})})
const replaceRolePermissionsValidator=z.object({params:z.object({roleId:z.coerce.number().int().positive()}),body:z.object({permissionIds:z.array(z.coerce.number().int().positive())})})
const membershipParamsValidator=z.object({params:z.object({membershipId:z.string().uuid()})})
const membershipRolesValidator=z.object({params:z.object({membershipId:z.string().uuid()}),body:z.object({roleIds:z.array(z.coerce.number().int().positive())})})
export {createModuleValidator,createPermissionValidator,setModuleActiveValidator,createRoleValidator,roleParamsValidator,replaceRolePermissionsValidator,membershipParamsValidator,membershipRolesValidator}
