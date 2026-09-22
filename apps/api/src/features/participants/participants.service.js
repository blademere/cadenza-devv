import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import { requireAppId } from '../../platform/applications/application-scope.js'
import {
  addParticipant,
  listParticipants,
  findParticipant,
  findCase,
  findPerson,
  removeParticipant,
} from './participants.repository.js'

const ensureCaseAndPerson = async ({ caseId, personId, appId, db }) => {
  const [caseRecord, person] = await Promise.all([
    findCase(caseId, appId, db),
    findPerson(personId, db),
  ])
  if (!caseRecord) throw new NotFoundError('Case not found.')
  if (!person) throw new NotFoundError('Person not found.')
}

const add = async ({
  caseId,
  personId,
  roleKey,
  isPrimary = false,
  metadata,
  appId,
  db,
}) => {
  requireAppId(appId)
  if (!caseId || !personId || !roleKey?.trim()) {
    throw new BadRequestError('caseId, personId, and roleKey are required.')
  }

  const normalizedRoleKey = roleKey.trim()
  await ensureCaseAndPerson({ caseId, personId, appId, db })

  const existing = await findParticipant(
    caseId,
    personId,
    normalizedRoleKey,
    appId,
    db
  )
  if (existing) {
    throw new ConflictError(
      'Participant is already assigned to this case role.'
    )
  }

  const participant = await addParticipant(
    {
      caseId,
      personId,
      roleKey: normalizedRoleKey,
      isPrimary,
      metadata,
    },
    appId,
    db
  )
  if (!participant) throw new NotFoundError('Case not found.')
  return participant
}

const list = async ({ caseId, appId, db }) => {
  requireAppId(appId)
  const caseRecord = await findCase(caseId, appId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listParticipants(caseId, appId, db)
}

const remove = async ({ id, appId, db }) => {
  requireAppId(appId)
  const participant = await removeParticipant(id, appId, db)
  if (!participant) throw new NotFoundError('Participant not found.')
  return participant
}

export default { add, list, remove }
