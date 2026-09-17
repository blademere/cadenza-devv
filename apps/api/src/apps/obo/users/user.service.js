import bcrypt from 'bcrypt'
import {
  createPaginationMeta,
} from '../../../common/pagination/pagination.js'
import { toUserResponse } from '../../../features/users/user.mapper.js'
import * as usersService from '../../../features/users/user.service.js'
import { findAllOBOUsers } from './user.repository.js'
import {
  addMembership,
  addMembershipRole,
  requireActiveMembership,
} from '../../../platform/applications/application.service.js'

const listUsers = async ({ appId, filters, pagination, orderBy }) => {
  const { users, total } = await findAllOBOUsers({
    appId,
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

const createUser = async ({ appId, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await usersService.createUser({ email, passwordHash })
  const membership = await addMembership({ userId: user.id, appId })

  return {
    user,
    membership,
  }
}

const assignUserRole = async ({ appId, userId, roleId }) => {
  const membership = await requireActiveMembership({ userId, appId })
  const assignment = await addMembershipRole({
    membershipId: membership.id,
    roleId,
    appId,
  })

  return {
    userId,
    membershipId: membership.id,
    role: assignment,
  }
}

export {
  listUsers,
  createUser,
  assignUserRole,
}
