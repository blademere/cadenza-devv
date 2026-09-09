import { NotFoundError } from '../../common/errors/appError.js'
import { findPersonByUserId, createPerson, updatePerson } from './people.repository.js'
import { findUserById } from '../auth/auth.repository.js'

const getSelfProfile = async (userId) => {
  const person = await findPersonByUserId(userId)
  if (person) return person
  return null
}

const updateSelfProfile = async (userId, data) => {
  const user = await findUserById(userId)
  if (!user) throw new NotFoundError('User account not found.')

  const existing = await findPersonByUserId(userId)
  if (existing) return updatePerson(existing.id, data)

  return createPerson({
    ...data,
    userId: Number(userId),
    email: user.email,
  })
}

export { getSelfProfile, updateSelfProfile }
