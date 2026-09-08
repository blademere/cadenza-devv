import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as peopleService from '../../../features/people/people.service.js'
import * as repository from './client.repository.js'

const createProfile = async ({ userId, ...data }) => {
  const existing = await repository.findByUserId(userId)
  if (existing) throw new ConflictError('An OBO client profile already exists for this account.')

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
  const person = await repository.findByUserId(userId)
  if (!person) throw new NotFoundError('OBO client profile not found.')
  return peopleService.update(person.id, data)
}

export { createProfile, getProfile, updateProfile }
