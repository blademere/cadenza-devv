const bcrypt = require('bcrypt')
const { ConflictError } = require('../../common/errors/appError')
const { findUserByEmail, findRoleByName, createUser } = require('./auth.repository')
const { toPublicAuthUser } = require('./auth.mapper')

const registerClient = async ({ email, password }) => {
  const existingUser = await findUserByEmail(email)
  if (existingUser) throw new ConflictError('An account with this email already exists.')

  const role = await findRoleByName('client')
  if (!role) throw new Error("The 'client' role is not configured.")

  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const user = await createUser({ email, roleId: role.id, passwordHash })
    return toPublicAuthUser(user)
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('An account with this email already exists.')
    throw error
  }
}

module.exports = { registerClient }
