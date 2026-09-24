import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as peopleService from '../../../features/people/people.service.js'

const createProfile = async ({ userId, ...data }) => {
  try {
    return await peopleService.create({ ...data, userId })
  } catch (error) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes?.('userId')) {
      throw new ConflictError('An OBO client profile already exists for this account.')
    }
    throw error
  }
}

const getProfile = async ({ userId }) => {
  try {
    return await peopleService.getByUserId(userId)
  } catch (error) {
    if (error instanceof NotFoundError) throw new NotFoundError('OBO client profile not found.')
    throw error
  }
}

const updateProfile = async ({ userId, ...data }) => {
  const person = await peopleService.getByUserId(userId)
  return peopleService.update(person.id, data)
}

export { createProfile, getProfile, updateProfile }
