import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import { recordAudit } from '../../platform/audit/audit.service.js'
import { requireAppId } from '../../platform/applications/application-scope.js'
import { RESOURCE_STATUS } from './resource.constants.js'
import * as repository from './resource.repository.js'

const requireNonEmptyString = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError(field + ' is required.')
  }

  return value.trim()
}

const validateMetadata = (metadata) => {
  if (metadata === undefined || metadata === null) return null

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new BadRequestError('Resource metadata must be a JSON object.')
  }

  return metadata
}

const validateCreateInput = (data = {}) => {
  const key = requireNonEmptyString(data.key, 'Resource key')
  const name = requireNonEmptyString(data.name, 'Resource name')
  const type = requireNonEmptyString(data.type, 'Resource type')

  if (data.status !== undefined && !Object.values(RESOURCE_STATUS).includes(data.status)) {
    throw new BadRequestError('Resource status is invalid.')
  }

  return {
    key,
    name,
    type,
    status: data.status ?? RESOURCE_STATUS.ACTIVE,
    description: data.description == null
      ? null
      : requireNonEmptyString(data.description, 'Resource description'),
    metadata: validateMetadata(data.metadata),
  }
}

const validateUpdateInput = (data = {}) => {
  const update = {}

  if (data.name !== undefined) update.name = requireNonEmptyString(data.name, 'Resource name')
  if (data.type !== undefined) update.type = requireNonEmptyString(data.type, 'Resource type')
  if (data.description !== undefined) {
    update.description = data.description == null
      ? null
      : requireNonEmptyString(data.description, 'Resource description')
  }
  if (data.metadata !== undefined) update.metadata = validateMetadata(data.metadata)

  if (Object.keys(update).length === 0) {
    throw new BadRequestError('At least one resource field must be updated.')
  }

  return update
}

const getResource = async ({ id, appId, db }) => {
  const owner = requireAppId(appId)
  const resourceId = requireNonEmptyString(id, 'Resource id')
  const resource = await repository.findResource(resourceId, owner, db)

  if (!resource) throw new NotFoundError('Resource not found.')

  return resource
}

const getResourceByKey = async ({ key, appId, db }) => {
  const owner = requireAppId(appId)
  const resourceKey = requireNonEmptyString(key, 'Resource key')
  const resource = await repository.findResourceByKey(resourceKey, owner, db)

  if (!resource) throw new NotFoundError('Resource not found.')

  return resource
}

const listResources = ({ appId, status, type, db } = {}) => {
  const owner = requireAppId(appId)

  if (status !== undefined && !Object.values(RESOURCE_STATUS).includes(status)) {
    throw new BadRequestError('Resource status is invalid.')
  }

  const normalizedType = type === undefined
    ? undefined
    : requireNonEmptyString(type, 'Resource type')

  return repository.listResources({
    appId: owner,
    status,
    type: normalizedType,
  }, db)
}

const createResource = async ({ actorId, appId, data }) => {
  const owner = requireAppId(appId)
  const input = validateCreateInput(data)

  return repository.withTransaction(async (tx) => {
    const existing = await repository.findResourceByKey(input.key, owner, tx)
    if (existing) {
      throw new ConflictError('A resource with this key already exists in this application.')
    }

    const created = await repository.createResource({
      ...input,
      appId: owner,
    }, tx)

    await recordAudit({
      actorId,
      appId: owner,
      action: 'RESOURCE_CREATED',
      entityType: 'Resource',
      entityId: created.id,
      before: null,
      after: created,
      db: tx,
    })

    return created
  })
}

const updateResource = async ({ actorId, appId, id, data }) => {
  const owner = requireAppId(appId)
  const resourceId = requireNonEmptyString(id, 'Resource id')
  const input = validateUpdateInput(data)

  return repository.withTransaction(async (tx) => {
    const before = await repository.findResource(resourceId, owner, tx)
    if (!before) throw new NotFoundError('Resource not found.')

    const result = await repository.updateResource({
      id: resourceId,
      appId: owner,
      data: input,
    }, tx)

    if (result.count !== 1) {
      throw new ConflictError('Resource was modified or no longer exists.')
    }

    const after = await repository.findResource(resourceId, owner, tx)

    await recordAudit({
      actorId,
      appId: owner,
      action: 'RESOURCE_UPDATED',
      entityType: 'Resource',
      entityId: resourceId,
      before,
      after,
      db: tx,
    })

    return after
  })
}

const transitionResource = async ({ actorId, appId, id, status, action }) => {
  const owner = requireAppId(appId)
  const resourceId = requireNonEmptyString(id, 'Resource id')

  return repository.withTransaction(async (tx) => {
    const before = await repository.findResource(resourceId, owner, tx)
    if (!before) throw new NotFoundError('Resource not found.')

    if (before.status === status) return before

    const result = status === RESOURCE_STATUS.ACTIVE
      ? await repository.activateResource(resourceId, owner, tx)
      : await repository.deactivateResource(resourceId, owner, tx)

    if (result.count !== 1) {
      throw new ConflictError('Resource was modified or no longer exists.')
    }

    const after = await repository.findResource(resourceId, owner, tx)

    await recordAudit({
      actorId,
      appId: owner,
      action,
      entityType: 'Resource',
      entityId: resourceId,
      before,
      after,
      db: tx,
    })

    return after
  })
}

const activateResource = ({ actorId, appId, id }) =>
  transitionResource({
    actorId,
    appId,
    id,
    status: RESOURCE_STATUS.ACTIVE,
    action: 'RESOURCE_ACTIVATED',
  })

const deactivateResource = ({ actorId, appId, id }) =>
  transitionResource({
    actorId,
    appId,
    id,
    status: RESOURCE_STATUS.INACTIVE,
    action: 'RESOURCE_DEACTIVATED',
  })

export {
  validateCreateInput,
  validateUpdateInput,
  getResource,
  getResourceByKey,
  listResources,
  createResource,
  updateResource,
  activateResource,
  deactivateResource,
}
