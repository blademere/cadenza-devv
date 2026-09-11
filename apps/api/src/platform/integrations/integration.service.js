import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import * as repository from './integration.repository.js'

const createIntegration = async ({ key, name, type, config = null, secretRef = null }) => {
  if (!key || !name || !type)
    throw new BadRequestError('Integration key, name, and type are required.')
  if (await repository.findByKey(key))
    throw new ConflictError(`Integration '${key}' already exists.`)
  return repository.create({ key, name, type, config, secretRef })
}

const subscribeEvent = async ({ integrationKey, event, config = null }) => {
  if (!event) throw new BadRequestError('Integration event is required.')
  const integration = await repository.findByKey(integrationKey)
  if (!integration || !integration.active)
    throw new NotFoundError(`Active integration '${integrationKey}' was not found.`)
  return repository.upsertEvent({ integrationId: integration.id, event, config })
}

const getActiveSubscribers = async (event) => repository.findActiveSubscribers(event)

export { createIntegration, subscribeEvent, getActiveSubscribers }
