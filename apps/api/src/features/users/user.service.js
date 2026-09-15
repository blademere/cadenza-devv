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
  findUserByEmail,
  createUser,
  findUser,
  findRoleForAssignment,
} from './user.repository.js'
import { toUserResponse } from './user.mapper.js'
import * as peopleService from '../people/people.service.js'
import {
  getRoleById,
  getAuthorizationContext,
} from '../../platform/authorization/access-control.service.js'
import {
  getUserMembership,
  addMembership,
  addMembershipRole,
  removeMembershipRoleAssignment,
} from '../../platform/applications/application.service.js'

const permissionKey = (permission) => {
  if (typeof permission === 'string') return permission
  const resource = permission.resource ?? permission.module?.key
  return `${resource}:${permission.action}`
}

const toPermissionSet = (permissions = []) => new Set(
  permissions instanceof Set ? permissions : permissions.map(permissionKey),
)

const canAssignRole = (requesterPermissions, targetRole) => {
  const requesterPermissionSet = toPermissionSet(requesterPermissions)
  return targetRole.permissions.every(({ permission }) => {
    if (permission.module?.isActive === false) return false
    return requesterPermissionSet.has(permissionKey(permission))
  })
}

const roleResponse = (roles = []) => roles.map(({ id, name, description }) => ({ id, name, description }))
const userWithMembershipRoles = (user, appId) => {
  const membership = (user.appMemberships ?? []).find((candidate) => !appId || candidate.appId === appId)
  return { ...user, roles: roleResponse((membership?.roles ?? []).map(({ role }) => role)) }
}

const listUsers = async (query = {}, appId) => {
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(query, ['createdAt', 'updatedAt', 'email', 'isActive'], 'createdAt')
  const filters = pickFilters(query, ['email', 'isActive'])
  const { users, total } = await findAllUsers({ skip: pagination.skip, take: pagination.take, filters, orderBy, appId })
  return {
    data: users.map((user) => toUserResponse(userWithMembershipRoles(user, appId))),
    pagination: createPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
  }
}

const registerUser = async ({ requesterId, appId, email, roleId, password }) => {
  if (!appId) throw new ForbiddenError('Application context is required to create users.')
  const requester = await getAuthorizationContext(requesterId, appId)
  if (!requester) throw new ForbiddenError('Your account is not authorized to create users.')
  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('A user with this email already exists.')
  const role = await getRoleById(roleId)
  if (!role) throw new NotFoundError('Role not found.')
  if (!canAssignRole(requester.permissions, role)) {
    throw new ForbiddenError('You cannot assign a role containing permissions that you do not have.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await createUser({ email, passwordHash })
  const membership = await addMembership({ userId: user.id, appId })
  await addMembershipRole({ membershipId: membership.id, roleId: role.id })
  return toUserResponse({ ...user, roles: [role] })
}

const assignUserRole = async ({ requesterId, appId, userId, roleId }) => {
  if (!appId) throw new ForbiddenError('Application context is required to manage user roles.')
  const [requester, targetUser, targetRole, targetMembership] = await Promise.all([
    getAuthorizationContext(requesterId, appId),
    findUser(userId),
    findRoleForAssignment(roleId),
    getUserMembership({ userId, appId }),
  ])
  if (!requester) throw new ForbiddenError('Your account is not authorized to manage users.')
  if (!targetUser) throw new NotFoundError('User not found.')
  if (!targetRole) throw new NotFoundError('Role not found.')
  if (!targetMembership) throw new ForbiddenError('Target user does not have an active membership for this application.')

  const requesterPermissionSet = toPermissionSet(requester.permissions)
  if (!requesterPermissionSet.has('authorization:manage')) {
    throw new ForbiddenError('You do not have permission to assign user roles.')
  }

  const currentRoles = targetMembership.roles ?? []
  const currentHasTarget = currentRoles.some((role) => role.id === targetRole.id)
  if (currentHasTarget && currentRoles.length === 1) {
    return toUserResponse({ ...targetUser, roles: currentRoles })
  }

  if (Number(requesterId) === Number(userId)) {
    const retainsAuthorization = targetRole.permissions.some(({ permission }) => (
      permission.module?.isActive !== false &&
      permission.module?.key === 'authorization' &&
      permission.action === 'manage'
    ))
    if (!retainsAuthorization) {
      throw new ForbiddenError('You cannot remove your own authorization management permission.')
    }
  }

  for (const currentRole of currentRoles) {
    if (currentRole.id !== targetRole.id) {
      await removeMembershipRoleAssignment({ membershipId: targetMembership.id, roleId: currentRole.id })
    }
  }
  await addMembershipRole({ membershipId: targetMembership.id, roleId: targetRole.id })

  return toUserResponse({ ...targetUser, roles: [targetRole] })
}

const getMyProfile = async (userId, appId) => {
  const user = await findUser(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const person = await peopleService.getByUserId(userId)
  const membership = appId ? await getUserMembership({ userId, appId }) : null
  return { user: toUserResponse({ ...user, roles: membership?.roles ?? [] }), person }
}

const createMyProfile = async (userId, data, appId) => {
  const user = await findUser(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const existingPerson = await peopleService.getByUserId(userId).catch((error) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (existingPerson) throw new ConflictError('Profile already exists.')
  const person = await peopleService.create({ ...data, userId })
  const membership = appId ? await getUserMembership({ userId, appId }) : null
  return { user: toUserResponse({ ...user, roles: membership?.roles ?? [] }), person }
}

const updateMyProfile = async (userId, data, appId) => {
  const user = await findUser(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  const person = await peopleService.getByUserId(userId)
  const updatedPerson = await peopleService.update(person.id, data)
  const membership = appId ? await getUserMembership({ userId, appId }) : null
  return { user: toUserResponse({ ...user, roles: membership?.roles ?? [] }), person: updatedPerson }
}

export {
  listUsers,
  registerUser,
  assignUserRole,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}