import bcrypt from 'bcrypt'
import * as usersService from '../../../features/users/user.service.js'
import {
  addMembership,
  addMembershipRole,
  requireActiveMembership,
} from '../../../platform/applications/application.service.js'

const listUsers = ({ appId, filters, pagination, orderBy }) =>
  usersService.listUsers({ appId, filters, pagination, orderBy })

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
