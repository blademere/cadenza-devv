import { BadRequestError, ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import * as peopleService from '../../../features/people/people.service.js'
import * as repository from './staff.repository.js'
import { STAFF_STATUS, STAFF_TYPE } from '../cadenza.constants.js'
import { ensureMembershipRole } from '../authorization/authorization-management.service.js'

const VALID_TYPES = new Set(Object.values(STAFF_TYPE))
const VALID_STATUSES = new Set(Object.values(STAFF_STATUS))

const normalize = ({ staffType, status, metadata }) => {
  if (!VALID_TYPES.has(staffType)) throw new BadRequestError('staffType is invalid.')
  if (!VALID_STATUSES.has(status)) throw new BadRequestError('status is invalid.')
  return { staffType, status, metadata: metadata ?? null }
}

const list = ({ appId }) => repository.list(requireAppId(appId))

const get = async ({ appId, id }) => {
  const app = requireAppId(appId)
  const staff = await repository.findById(id, app)
  if (!staff) throw new NotFoundError('Cadenza staff member not found.')
  return staff
}

const create = async ({ appId, personId, staffType = STAFF_TYPE.STAFF, status = STAFF_STATUS.ACTIVE, metadata, actorId }) => {
  const app = requireAppId(appId)
  if (!personId) throw new BadRequestError('personId is required.')
  const person = await peopleService.getById(personId)
  if (!person.userId) throw new BadRequestError('Staff member must have an authenticated user identity.')
  if (!person.isActive) throw new BadRequestError('Person is inactive.')
  const input = normalize({ staffType, status, metadata })
  if (await repository.findByPersonId(personId, app))
    throw new ConflictError('Person is already registered as Cadenza staff for this application.')
  try {
    const created = await repository.create({ appId: app, personId, ...input })
    await recordAudit({
      actorId,
      appId: app,
      action: 'CADENZA_STAFF_CREATED',
      entityType: 'CadenzaStaff',
      entityId: created.id,
      after: created,
    })
    await ensureMembershipRole({ userId: person.userId, appId: app, roleName: 'cadenza_frontdesk', actorId })
    return created
  } catch (error) {
    if (error?.code === 'P2002')
      throw new ConflictError('Person is already registered as Cadenza staff for this application.')
    throw error
  }
}

const listCandidates = ({ appId }) => repository.listCandidates(requireAppId(appId))

const update = async ({ appId, id, staffType, status, metadata, actorId }) => {
  const app = requireAppId(appId)
  const current = await repository.findById(id, app)
  if (!current) throw new NotFoundError('Cadenza staff member not found.')
  const input = normalize({
    staffType: staffType ?? current.staffType,
    status: status ?? current.status,
    metadata: metadata === undefined ? current.metadata : metadata,
  })
  const result = await repository.update(id, app, input)
  if (result.count !== 1) throw new ConflictError('Cadenza staff member was modified or no longer exists.')
  const updated = await repository.findById(id, app)
  await recordAudit({
    actorId,
    appId: app,
    action: 'CADENZA_STAFF_UPDATED',
    entityType: 'CadenzaStaff',
    entityId: id,
    before: current,
    after: updated,
  })
  return updated
}

export { list, get, create, listCandidates, update }
