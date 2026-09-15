import crypto from 'node:crypto'
import { BadRequestError, ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import * as peopleService from '../../../features/people/people.service.js'
import * as repository from './professional.repository.js'

const normalizeCredential = (value) => value?.trim() || ''
const normalizeProfessionalRole = (value) => value?.trim() || ''
const createRegistrationNumber = () =>
  `PRO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
const getProfile = async ({ userId }) => peopleService.getByUserId(userId)
const createProfile = async ({ userId, ...data }) => {
  const existing = await repository.findPersonByUserId(userId)
  if (existing) throw new ConflictError('Professional person profile already exists.')
  return peopleService.create({ ...data, userId })
}
const updateProfile = async ({ userId, ...data }) => {
  const existing = await repository.findPersonByUserId(userId)
  if (!existing) throw new NotFoundError('Professional person profile not found.')
  return peopleService.update(existing.id, data)
}
const applyForVerification = async ({ userId, prcId, ptrNumber, professionalRole }) => {
  const normalizedPrcId = normalizeCredential(prcId)
  const normalizedPtrNumber = normalizeCredential(ptrNumber)
  const normalizedProfessionalRole = normalizeProfessionalRole(professionalRole)

  if (!normalizedPrcId) throw new BadRequestError('prcId is required.')
  if (!normalizedPtrNumber) throw new BadRequestError('ptrNumber is required.')

  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('User does not have a person profile. Complete your person profile before applying for professional verification.')

  const existing = await repository.findByPersonId(person.id)
  if (existing) throw new ConflictError('A professional application already exists for this person.')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await repository.create({
        personId: person.id,
        registrationNumber: createRegistrationNumber(),
        prcId: normalizedPrcId,
        ptrNumber: normalizedPtrNumber,
        ...(normalizedProfessionalRole ? { professionalRole: normalizedProfessionalRole } : {}),
      })
    } catch (error) {
      if (error?.code !== 'P2002' || attempt === 4) throw error
    }
  }

  throw new ConflictError('Unable to generate a unique professional registration number.')
}
const getMine = async ({ userId }) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new NotFoundError('Professional application not found.')
  const professional = await repository.findByPersonId(person.id)
  if (!professional) throw new NotFoundError('Professional application not found.')
  return professional
}
const getForAuthorization = (id) => repository.findById(id)
const getForReference = (id) => repository.findById(id)
const listPending = () => repository.listPending()
const listVerified = () => repository.listVerified()
const listDirectory = ({ status = 'VERIFIED', role, search } = {}) => repository.listLookup({ status, role, search })
const decideVerification = async ({ id, actorId, decision, reason }) => {
  const professional = await repository.findById(id)
  if (!professional) throw new NotFoundError('Professional application not found.')
  if (professional.status !== 'PENDING_VERIFICATION') throw new ConflictError('Professional application is not awaiting verification.')
  if (Number(professional.person?.userId) === Number(actorId)) throw new ConflictError('A professional cannot approve or decline their own application.')
  const accepted = decision === 'ACCEPTED'
  const cleanReason = reason?.trim() || null
  if (!accepted && !cleanReason) throw new BadRequestError('A reason is required when declining a professional verification application.')
  return repository.withTransaction(async (tx) => {
    const updated = await repository.update(id, { status: accepted ? 'VERIFIED' : 'DECLINED', verifiedByUserId: actorId, verifiedAt: new Date(), verificationReason: cleanReason }, tx)
    await repository.addDecision({ professionalId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    const person = await repository.findPersonById(professional.personId, tx)
    await publish({ db: tx, event: 'obo.professional.verification.decided', entityType: 'OboProfessional', entityId: id, actorId, context: { professionalUserId: person?.userId || null, professionalEmail: person?.user?.email || person?.email || null, registrationNumber: professional.registrationNumber, prcId: professional.prcId, ptrNumber: professional.ptrNumber, professionalRole: professional.professionalRole || null, decision, reason: cleanReason, status: updated.status }, idempotencyKey: `obo:professional:${id}:verification:${updated.verifiedAt?.toISOString() || Date.now()}` })
    return updated
  })
}

export { getProfile, createProfile, updateProfile, applyForVerification, getMine, getForAuthorization, getForReference, listPending, listVerified, listDirectory, decideVerification }
