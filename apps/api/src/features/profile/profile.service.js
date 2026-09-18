import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  findUser,
} from '../users/user.repository.js'
import { toUserResponse } from '../users/user.mapper.js'
import * as peopleService from '../people/people.service.js'

const getUser = async (userId) => {
  const user = await findUser(Number(userId))
  if (!user) throw new NotFoundError('User not found.')
  return user
}

const getMyProfile = async (userId) => {
  const user = await getUser(userId)
  const person = await peopleService.getByUserId(userId)
  return { user: toUserResponse({ ...user, roles: [] }), person }
}

const createMyProfile = async (userId, data) => {
  const user = await getUser(userId)
  const existingPerson = await peopleService.getByUserId(userId).catch((error) => {
    if (error instanceof NotFoundError) return null
    throw error
  })
  if (existingPerson) throw new ConflictError('Profile already exists.')

  const person = await peopleService.create({ ...data, userId })
  return { user: toUserResponse({ ...user, roles: [] }), person }
}

const updateMyProfile = async (userId, data) => {
  const user = await getUser(userId)
  const person = await peopleService.getByUserId(userId)
  const updatedPerson = await peopleService.update(person.id, data)
  return { user: toUserResponse({ ...user, roles: [] }), person: updatedPerson }
}

export {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}

export default {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
}
