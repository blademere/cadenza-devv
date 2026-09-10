import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  addParticipant,
  listParticipants,
  findParticipant,
  findCase,
  findPerson,
  removeParticipant,
} from './participants.repository.js'

const ensureCaseAndPerson = async (caseId, personId, db) => {
  const [caseRecord, person] = await Promise.all([
    findCase(caseId, db),
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
  db,
}) => {
  if (!caseId || !personId || !roleKey?.trim()) {
    throw new BadRequestError('caseId, personId, and roleKey are required.')
  }
  const normalizedRoleKey = roleKey.trim()
  await ensureCaseAndPerson(caseId, personId, db)
  const existing = await findParticipant(caseId, personId, normalizedRoleKey, db)
  if (existing)
    throw new ConflictError(
      'Participant is already assigned to this case role.'
    )
  return addParticipant({
    caseId,
    personId,
    roleKey: normalizedRoleKey,
    isPrimary,
    metadata,
  }, db)
}

const list = async (caseId, { db } = {}) => {
  const caseRecord = await findCase(caseId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listParticipants(caseId, db)
}

const remove = async (id, { db } = {}) => {
  try {
    return await removeParticipant(id, db)
  } catch (error) {
    if (error?.code === 'P2025')
      throw new NotFoundError('Participant not found.')
    throw error
  }
}

export default { add, list, remove }
