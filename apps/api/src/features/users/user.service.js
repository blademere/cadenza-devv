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

/**
 * List users through the reusable user capability.
 *
 * Contract:
 * - filters contains persistence-level user filters.
 * - pagination contains normalized { page, limit, skip, take } values.
 * - orderBy contains the validated Prisma ordering expression.
 *
 * Application membership, application roles, and application-specific
 * authorization remain outside this capability.
 */
const listUsers = async ({ filters = {}, pagination, orderBy }) => {
  const { users, total } = await findAllUsers({
    skip: pagination.skip,
    take: pagination.take,
    filters,
    orderBy,
  })

  return {
    data: users.map((user) => toUserResponse(user)),
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
