import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as documentRequirementService from '../../../platform/documents/document-requirement.service.js'
import * as planPermitService from '../plan-permits/plan-permit.service.js'
import * as repository from './application-document.repository.js'

const STATUS = Object.freeze({ PENDING: 'PENDING', RECEIVED: 'RECEIVED', REJECTED: 'REJECTED' })

const getApplication = (id) => planPermitService.getForReceiving(id)

const getApplicableRequirements = async (application, db) => {
  if (!application.formVersionId) return []
  const requirements = await documentRequirementService.listForFormVersion(application.formVersionId, db)
  return requirements.filter((requirement) => formService.evaluateCondition(requirement.condition, application.formValues || {}))
}

const ensureChecklist = async (application, db, requirements = null) => {
  const applicableRequirements = requirements ?? await getApplicableRequirements(application, db)
  if (applicableRequirements.length) {
    await repository.createMany(applicableRequirements.map((requirement) => ({
      applicationId: application.id,
      requirementId: requirement.id,
      status: STATUS.PENDING,
    })), db)
  }
  return applicableRequirements
}

const normalizeChecklist = (rows, requirements) => {
  const byRequirement = new Map(rows.map((row) => [row.requirementId, row]))
  return requirements.map((requirement) => ({
    ...(byRequirement.get(requirement.id) || {
      id: null,
      applicationId: null,
      requirementId: requirement.id,
      status: STATUS.PENDING,
      receivedAt: null,
      receivedByUserId: null,
      verifiedAt: null,
      verifiedByUserId: null,
      notes: null,
      documentId: null,
    }),
    requirement,
    document: null,
    receivedBy: null,
    verifiedBy: null,
  }))
}

const getChecklist = async ({ applicationId }) => {
  const application = await getApplication(applicationId)
  const requirements = await ensureChecklist(application)
  const rows = await repository.listByApplicationId(application.id)
  return normalizeChecklist(rows, requirements)
}

const updateReceiptStatus = async ({ applicationId, requirementId, actorId, status, notes }) => {
  const application = await getApplication(applicationId)
  if (application.status !== 'RECEIVING') {
    throw new ConflictError('Document receipt can only be recorded while the application is in receiving.')
  }

  const requirements = await ensureChecklist(application)
  const requirement = requirements.find((item) => item.id === requirementId)
  if (!requirement) throw new NotFoundError('Document requirement not found for this application.')

  const existing = await repository.findByApplicationAndRequirement(application.id, requirement.id)
  if (!existing) throw new NotFoundError('Application document checklist item not found.')

  if (![STATUS.RECEIVED, STATUS.REJECTED].includes(status)) {
    throw new ConflictError('Unsupported document receipt status.')
  }

  const cleanNotes = notes?.trim() || null
  const updated = await repository.updateStatus(existing.id, {
    status,
    notes: cleanNotes,
    ...(status === STATUS.RECEIVED
      ? { receivedAt: existing.receivedAt || new Date(), receivedByUserId: existing.receivedByUserId || actorId }
      : { receivedAt: null, receivedByUserId: null }),
  })

  await recordAudit({
    actorId,
    action: `OBO_PERMIT_APPLICATION_DOCUMENT_${status}`,
    entityType: 'OboPermitApplicationDocument',
    entityId: updated.id,
    before: existing,
    after: updated,
    metadata: {
      applicationId: application.id,
      referenceNumber: application.referenceNumber,
      requirementId: requirement.id,
      requirementName: requirement.name,
    },
  })

  return {
    ...updated,
    requirement,
    document: null,
    receivedBy: null,
    verifiedBy: null,
  }
}

const validateRequiredDocuments = async ({ applicationId, db }) => {
  const application = await getApplication(applicationId)
  const requirements = await ensureChecklist(application, db)
  const rows = await repository.listByApplicationId(application.id, db)
  const rowByRequirement = new Map(rows.map((row) => [row.requirementId, row]))
  const missing = requirements
    .filter((requirement) => requirement.required)
    .filter((requirement) => rowByRequirement.get(requirement.id)?.status !== STATUS.RECEIVED)

  if (missing.length) {
    throw new ConflictError(`Required hard-copy documents are incomplete: ${missing.map((item) => item.name).join(', ')}.`)
  }

  return true
}

export { STATUS, getChecklist, updateReceiptStatus, validateRequiredDocuments, ensureChecklist }
