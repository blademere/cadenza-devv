const bcrypt = require('bcrypt')
const { ConflictError } = require('../../common/errors/appError')
const { findUserByEmail, findRoleByName, createUser } = require('./auth.repository')
const { issueEmailVerification } = require('./email-verification.service')

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role
    ? { id: user.role.id, name: user.role.name, description: user.role.description }
    : null,
})

const registerUser = async ({ email, password }) => {
  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('An account with this email already exists.')

  const role = await findRoleByName('client')
  if (!role) throw new Error("The default 'client' role is not configured.")

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const user = await createUser({ email, roleId: role.id, passwordHash })
    await issueEmailVerification({ userId: user.id, reason: 'registration' })
    return toPublicUser(user)
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('An account with this email already exists.')
    throw error
  }
}

module.exports = { registerUser }
