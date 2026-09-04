import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as peopleService from '../../../features/people/people.service.js'
import * as repository from './client.repository.js'

const createMine = async ({ userId, ...data }) => {
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

const getMine = async ({ userId }) => {
  try {
    return await peopleService.getByUserId(userId)
  } catch (error) {
    if (error instanceof NotFoundError) throw new NotFoundError('OBO client profile not found.')
    throw error
  }
}

export { createMine, getMine }
