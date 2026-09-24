import { ConflictError, NotFoundError, BadRequestError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import * as peopleService from '../../../features/people/people.service.js'
import * as repository from './customer.repository.js'
import { ensureMembershipRole } from '../authorization/authorization-management.service.js'

const create = async ({ appId, personId, actorId }) => {
  const owner = requireAppId(appId)
  if (!personId) throw new BadRequestError('personId is required.')
  const manager = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_rentals', action: 'manage' })
  const person = await peopleService.getById(personId)
  if (!manager && Number(person.userId) !== Number(actorId))
    throw new ConflictError('You can only register your own account as a customer.')
  if (person.isActive === false) throw new BadRequestError('Person is inactive.')
  if (await repository.findByPersonId(personId, owner))
    throw new ConflictError('Person is already registered as a customer for this application.')
  try {
    const created = await repository.create({ appId: owner, personId })
    if (!created) throw new BadRequestError('Person must have an authenticated user identity.')
    await ensureMembershipRole({ userId: person.userId, appId: owner, roleName: 'cadenza_client', actorId })
    return created
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('Person is already registered as a customer for this application.')
    throw error
  }
}

const ensureMe = async ({ appId, actorId }) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  const existing = await repository.findByUserId(actorId, owner)
  if (existing) return existing
  const person = await peopleService.getByUserId(actorId)
  return create({ appId: owner, personId: person.id, actorId })
}

const list = async ({ appId }) => repository.list(requireAppId(appId))
const listCandidates = async ({ appId }) => repository.listCandidates(requireAppId(appId))

const get = async ({ appId, id, actorId }) => {
  const owner = requireAppId(appId)
  const value = await repository.findById(id, owner)
  if (!value) throw new NotFoundError('Customer not found.')
  const manager = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_rentals', action: 'manage' })
  if (!manager && Number(value.person?.userId) !== Number(actorId)) throw new NotFoundError('Customer not found.')
  return value
}

const update = async ({ appId, id, status }) => {
  const owner = requireAppId(appId)
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new BadRequestError('status is invalid.')
  const current = await repository.findById(id, owner)
  if (!current) throw new NotFoundError('Customer not found.')
  const result = await repository.update(id, owner, { status })
  if (result.count !== 1) throw new ConflictError('Customer was modified or no longer exists.')
  return repository.findById(id, owner)
}

export { create, ensureMe, list, listCandidates, get, update }
