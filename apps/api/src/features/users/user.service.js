import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  createPaginationMeta,
} from '../../common/pagination/pagination.js'
import {
  findAllUsers,
  findUserByEmail,
  createUser as createUserRecord,
  findUser,
} from './user.repository.js'
import { toUserResponse } from './user.mapper.js'
import * as peopleService from '../people/people.service.js'
import { getUserMembership } from '../../platform/applications/application.service.js'

const roleResponse = (roles = []) => roles.map(({ id, name, description }) => ({ id, name, description }))
const userWithMembershipRoles = (user, appId) => {
  const membership = (user.appMemberships ?? []).find((candidate) => !appId || candidate.appId === appId)
  return { ...user, roles: roleResponse((membership?.roles ?? []).map(({ role }) => role)) }
}

/**
 * List users through the reusable user capability.
 *
 * Contract:
 * - appId scopes users to an application's active memberships.
 * - filters contains persistence-level user filters.
 * - pagination contains normalized { page, limit, skip, take } values.
 * - orderBy contains the validated Prisma ordering expression.
 *
 * HTTP query parsing and application-specific authorization remain outside this
 * capability.
 */
const listUsers = async ({ appId = null, filters = {}, pagination, orderBy }) => {
  const { users, total } = await findAllUsers({
    skip: pagination.skip,
    take: pagination.take,
    filters,
    orderBy,
    appId,
  })

  return {
    data: users.map((user) => toUserResponse(userWithMembershipRoles(user, appId))),
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  }
}

/**
 * Create a global user identity from an already prepared password hash.
 * Application membership, role assignment, authorization, and password hashing are
 * intentionally outside this reusable user capability.
 */
const createUser = async ({ email, passwordHash }) => {
  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('A user with this email already exists.')
  const user = await createUserRecord({ email, passwordHash })
  return toUserResponse({ ...user, roles: [] })
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
  createUser,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}
