const bcrypt = require('bcrypt')

const { ConflictError, ForbiddenError, NotFoundError } = require('../../common/errors/appError')

const { findAllUsers, createUser } = require('./user.repository')

const { toUserResponse } = require('./user.mapper')

const { findUserByEmail } = require('../auth/auth.repository')

const {
  findRoleById,
  getUserAuthorizationContext,
} = require('../access-control/access-control.repository')

const getPermissionKey = ({ resource, action }) => `${resource}:${action}`

const canAssignRole = (requesterPermissions, targetRole) => {
  const requesterPermissionSet = new Set(
    requesterPermissions.map(getPermissionKey),
  )

  return targetRole.permissions.every(({ permission }) => {
    return requesterPermissionSet.has(
      getPermissionKey({
        resource: permission.module.key,
        action: permission.action,
      }),
    )
  })
}

const listUsers = async ({ page, limit }) => {
  const skip = (page - 1) * limit

  const { users, total } = await findAllUsers({
    skip,
    take: limit,
  })

  const data = users.map(toUserResponse)

  return {
    data,

    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

const registerUser = async ({ requesterId, email, roleId, password }) => {
  const requester = await getUserAuthorizationContext(requesterId)

  if (!requester) {
    throw new ForbiddenError('Your account is not authorized to create users.')
  }

  const existingUser = await findUserByEmail(email)

  if (existingUser) {
    throw new ConflictError('A user with this email already exists.')
  }

  const role = await findRoleById(roleId)

  if (!role) {
    throw new NotFoundError('Role not found.')
  }

  if (!canAssignRole(requester.permissions, role)) {
    throw new ForbiddenError(
      'You cannot assign a role containing permissions that you do not have.',
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await createUser({
    email,
    roleId,
    passwordHash,
  })

  return toUserResponse(user)
}

module.exports = {
  listUsers,
  registerUser,
}
