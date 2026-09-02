import { bcrypt } from 'bcrypt'
import { ConflictError } from '../../common/errors/appError.js'
import {
  findUserByEmail,
  findRoleByName,
  createUser,
} from './auth.repository.js'
import { issueEmailVerification } from './email-verification.service.js'

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role
    ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      }
    : null,
})

const registerUser = async ({ email, password }) => {
  const existingUser = await findUserByEmail(email)
  if (existingUser)
    throw new ConflictError('An account with this email already exists.')

  const role = await findRoleByName('client')
  if (!role) throw new Error("The default 'client' role is not configured.")

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const user = await createUser({ email, roleId: role.id, passwordHash })
    await issueEmailVerification({ userId: user.id, reason: 'registration' })
    return toPublicUser(user)
  } catch (error) {
    if (error?.code === 'P2002')
      throw new ConflictError('An account with this email already exists.')
    throw error
  }
}

export default { registerUser }
