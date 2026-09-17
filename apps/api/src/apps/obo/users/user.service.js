import bcrypt from 'bcrypt'
import * as usersService from '../../../features/users/user.service.js'
import {
  addMembership,
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

export {
  listUsers,
  createUser,
}
