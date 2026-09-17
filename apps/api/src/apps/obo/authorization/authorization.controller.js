import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './authorization-management.service.js'

const appId = (req) => req.security.app.id
const listModulesController = async (_req, res) => successResponse(res, 'OBO authorization modules retrieved successfully.', await service.listModules())
const createModuleController = async (req, res) => successResponse(res, 'OBO authorization module created successfully.', await service.createModule(req.validated.body), 201)
const createPermissionController = async (req, res) => successResponse(res, 'OBO permission created successfully.', await service.addPermission({ moduleId: req.validated.params.moduleId, action: req.validated.body.action }), 201)
const setModuleActiveController = async (req, res) => successResponse(res, 'OBO authorization module activation updated successfully.', await service.setModuleActive({ moduleId: req.validated.params.moduleId, isActive: req.validated.body.isActive }))
const listRolesController = async (req, res) => successResponse(res, 'OBO roles retrieved successfully.', await service.listRoles({ appId: appId(req) }))
const createRoleController = async (req, res) => successResponse(res, 'OBO role created successfully.', await service.createRole({ appId: appId(req), ...req.validated.body }), 201)
const getRoleController = async (req, res) => successResponse(res, 'OBO role retrieved successfully.', await service.getRole({ roleId: req.validated.params.roleId, appId: appId(req) }))
const replaceRolePermissionsController = async (req, res) => successResponse(res, 'OBO role permissions updated successfully.', await service.replaceRolePermissions({ roleId: req.validated.params.roleId, permissionIds: req.validated.body.permissionIds, appId: appId(req) }))
const listMembershipRolesController = async (req, res) => successResponse(res, 'OBO membership roles retrieved successfully.', await service.listMembershipRoles({ membershipId: req.validated.params.membershipId, appId: appId(req) }))
const replaceMembershipRolesController = async (req, res) => successResponse(res, 'OBO membership roles updated successfully.', await service.replaceMembershipRoles({ membershipId: req.validated.params.membershipId, appId: appId(req), roleIds: req.validated.body.roleIds }))

export { listModulesController, createModuleController, createPermissionController, setModuleActiveController, listRolesController, createRoleController, getRoleController, replaceRolePermissionsController, listMembershipRolesController, replaceMembershipRolesController }