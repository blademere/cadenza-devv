const bcrypt = require('bcrypt')

const { ConflictError, ForbiddenError, NotFoundError } = require('../../common/errors/appError')
const { normalizePagination, createPaginationMeta, createOrderBy, pickFilters } = require('../../common/pagination/pagination')
const { findAllUsers, createUser, findUserWithRole, findRoleForAssignment, updateUserRole } = require('./user.repository')
const { toUserResponse } = require('./user.mapper')
const { findUserByEmail } = require('../auth/auth.repository')
const { findRoleById, getUserAuthorizationContext } = require('../../platform/authorization/access-control.repository')
const { clearUserPermissionCache } = require('../../platform/authorization/access-control.service')

const getPermissionKey = ({ resource, action }) => `${resource}:${action}`

const canAssignRole = (requesterPermissions, targetRole) => {
  const requesterPermissionSet = new Set(requesterPermissions.map(getPermissionKey))
  return targetRole.permissions.every(({ permission }) =>
    permission.module.isActive && requesterPermissionSet.has(getPermissionKey({ resource: permission.module.key, action: permission.action })),
  )
}

const listUsers = async (query = {}) => {
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(query, ['createdAt', 'updatedAt', 'email', 'isActive'], 'createdAt')
  const filters = pickFilters(query, ['email', 'isActive'])
  const { users, total } = await findAllUsers({ skip: pagination.skip, take: pagination.take, filters, orderBy })
  return { data: users.map(toUserResponse), pagination: createPaginationMeta({ page: pagination.page, limit: pagination.limit, total }) }
}

const registerUser = async ({ requesterId, email, roleId, password }) => {
  const requester = await getUserAuthorizationContext(requesterId)
  if (!requester) throw new ForbiddenError('Your account is not authorized to create users.')
  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('A user with this email already exists.')
  const role = await findRoleById(roleId)
  if (!role) throw new NotFoundError('Role not found.')
  if (!canAssignRole(requester.permissions, role)) throw new ForbiddenError('You cannot assign a role containing permissions that you do not have.')
  const passwordHash = await bcrypt.hash(password, 12)
  return toUserResponse(await createUser({ email, roleId, passwordHash }))
}

const assignUserRole = async ({ requesterId, userId, roleId }) => {
  const [requester, targetUser, targetRole] = await Promise.all([
    getUserAuthorizationContext(requesterId),
    findUserWithRole(userId),
    findRoleForAssignment(roleId),
  ])

  if (!requester) throw new ForbiddenError('Your account is not authorized to manage users.')
  if (!targetUser) throw new NotFoundError('User not found.')
  if (!targetRole) throw new NotFoundError('Role not found.')

  if (!requester.permissions.has('authorization:manage')) {
    throw new ForbiddenError('You do not have permission to assign user roles.')
  }

  if (!canAssignRole(requester.permissions, targetRole)) {
    throw new ForbiddenError('You cannot assign a role containing permissions that you do not have.')
  }

  if (Number(requesterId) === Number(userId) && targetRole.id !== targetUser.roleId) {
    const retainsAuthorization = targetRole.permissions.some(({ permission }) =>
      permission.module.isActive && permission.module.key === 'authorization' && permission.action === 'manage',
    )
    if (!retainsAuthorization) throw new ForbiddenError('You cannot remove your own authorization management permission.')
  }

  if (targetUser.roleId === targetRole.id) return toUserResponse(targetUser)

  const updatedUser = await updateUserRole(userId, targetRole.id)
  await clearUserPermissionCache(userId)
  return toUserResponse(updatedUser)
}

module.exports = { listUsers, registerUser, assignUserRole }
