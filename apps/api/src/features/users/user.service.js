import bcrypt from 'bcrypt'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
  pickFilters,
} from '../../common/pagination/pagination.js'
import {
  findAllUsers,
  createUser,
  findUserWithRole,
  findRoleForAssignment,
  updateUserRole,
} from './user.repository.js'
import { toUserResponse } from './user.mapper.js'
import { findUserByEmail } from '../auth/auth.repository.js'
import * as peopleService from '../people/people.service.js'
import {
  findRoleById,
  getUserAuthorizationContext,
} from '../../platform/authorization/access-control.repository.js'
import { clearUserPermissionCache } from '../../platform/authorization/access-control.service.js'

const permissionKey = (permission) => {
  const resource = permission.resource ?? permission.module?.key
  return `${resource}:${permission.action}`
}

const canAssignRole = (requesterPermissions, targetRole) => {
  const requesterPermissionSet = new Set(
    (requesterPermissions || []).map((permission) => permissionKey(permission))
  )

  return targetRole.permissions.every(({ permission }) => {
    if (permission.module?.isActive === false) return false
    return requesterPermissionSet.has(permissionKey(permission))
  })
}

const listUsers = async (query = {}) => {
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(
    query,
    ['createdAt', 'updatedAt', 'email', 'isActive'],
    'createdAt'
  )
  const filters = pickFilters(query, ['email', 'isActive'])
  const { users, total } = await findAllUsers({
    skip: pagination.skip,
    take: pagination.take,
    filters,
    orderBy,
  })
  return {
    data: users.map(toUserResponse),
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  }
}

const registerUser = async ({ requesterId, email, roleId, password }) => {
  const requester = await getUserAuthorizationContext(requesterId)
  if (!requester)
    throw new ForbiddenError('Your account is not authorized to create users.')
  const existingUser = await findUserByEmail(email)
  if (existingUser)
    throw new ConflictError('A user with this email already exists.')
  const role = await findRoleById(roleId)
  if (!role) throw new NotFoundError('Role not found.')
  if (!canAssignRole(requester.permissions, role))
    throw new ForbiddenError(
      'You cannot assign a role containing permissions that you do not have.'
    )
  const passwordHash = await bcrypt.hash(password, 12)
  return toUserResponse(await createUser({ email, roleId, passwordHash }))
}

const assignUserRole = async ({ requesterId, userId, roleId }) => {
  const [requester, targetUser, targetRole] = await Promise.all([
    getUserAuthorizationContext(requesterId),
    findUserWithRole(userId),
    findRoleForAssignment(roleId),
  ])
  if (!requester)
    throw new ForbiddenError('Your account is not authorized to manage users.')
  if (!targetUser) throw new NotFoundError('User not found.')
  if (!targetRole) throw new NotFoundError('Role not found.')

  const requesterPermissionSet = new Set(
    (requester.permissions || []).map((permission) => permissionKey(permission))
  )
  if (!requesterPermissionSet.has('authorization:manage'))
    throw new ForbiddenError('You do not have permission to assign user roles.')

  if (
    Number(requesterId) === Number(userId) &&
    targetRole.id !== targetUser.roleId
  ) {
    const retainsAuthorization = targetRole.permissions.some(
      ({ permission }) => {
        const candidate = permission ?? {}
        return (
          candidate.module?.isActive !== false &&
          candidate.module?.key === 'authorization' &&
          candidate.action === 'manage'
        )
      }
    )
    if (!retainsAuthorization)
      throw new ForbiddenError(
        'You cannot remove your own authorization management permission.'
      )
  }

  if (targetUser.roleId === targetRole.id) return toUserResponse(targetUser)
  const updatedUser = await updateUserRole(userId, targetRole.id)
  await clearUserPermissionCache(userId)
  return toUserResponse(updatedUser)
}

const getMyProfile = async (userId) => {
  const user = await findUserWithRole(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const person = await peopleService.getByUserId(userId)

  return {
    user: toUserResponse(user),
    person,
  }
}

const createMyProfile = async (userId, data) => {
  const user = await findUserWithRole(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const existingPerson = await peopleService.getByUserId(userId).catch((error) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (existingPerson) throw new ConflictError('Profile already exists.')

  const person = await peopleService.create({ ...data, userId })
  return {
    user: toUserResponse(user),
    person,
  }
}

const updateMyProfile = async (userId, data) => {
  const user = await findUserWithRole(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const person = await peopleService.getByUserId(userId)
  const updatedPerson = await peopleService.update(person.id, data)

  return {
    user: toUserResponse(user),
    person: updatedPerson,
  }
}

export {
  listUsers,
  registerUser,
  assignUserRole,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}
