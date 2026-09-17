import { ConflictError } from '../../common/errors/appError.js'
import {
  createPaginationMeta,
} from '../../common/pagination/pagination.js'
import {
  findAllUsers,
  findUserByEmail,
  createUser as createUserRecord,
} from './user.repository.js'
import { toUserResponse } from './user.mapper.js'

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

export {
  listUsers,
  createUser,
}
