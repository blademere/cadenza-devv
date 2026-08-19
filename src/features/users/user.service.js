const bcrypt = require('bcrypt')

const { ConflictError, ForbiddenError, NotFoundError } = require('../../common/errors/appError')
const {
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
  pickFilters,
} = require('../../common/pagination/pagination')

const { findAllUsers, createUser } = require('./user.repository')
const { toUserResponse } = require('./user.mapper')
const { findUserByEmail } = require('../auth/auth.repository')
const {
  findRoleById,
  getUserAuthorizationContext,
} = require('../../platform/authorization/access-control.repository')

const getPermissionKey = ({ resource, action }) => `${resource}:${action}`

const canAssignRole = (requesterPermissions, targetRole) => {
  const requesterPermissionSet = new Set(requesterPermissions.map(getPermissionKey))
  return targetRole.permissions.every(({ permission }) => requesterPermissionSet.has(
    getPermissionKey({ resource: permission.module.key, action: permission.action }),
  ))
}

const listUsers = async (query = {}) => {
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(query, ['createdAt', 'updatedAt', 'email', 'isActive'], 'createdAt')
  const filters = pickFilters(query, ['email', 'isActive'])
  const { users, total } = await findAllUsers({ skip: pagination.skip, take: pagination.take, filters, orderBy })
  return {
    data: users.map(toUserResponse),
    pagination: createPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
  }
}

const registerUser = async ({ requesterId, email, roleId, password }) => {
  const requester = await getUserAuthorizationContext(requesterId)
  if (!requester) throw new ForbiddenError('Your account is not authorized to create users.')

  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('A user with this email already exists.')

  const role = await findRoleById(roleId)
  if (!role) throw new NotFoundError('Role not found.')

  if (!canAssignRole(requester.permissions, role)) {
    throw new ForbiddenError('You cannot assign a role containing permissions that you do not have.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await createUser({ email, roleId, passwordHash })
  return toUserResponse(user)
}

module.exports = { listUsers, registerUser }
