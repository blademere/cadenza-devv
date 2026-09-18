import crypto from 'crypto'
import { NotFoundError, BadRequestError, ConflictError } from '../../../common/errors/appError.js'
import { getStorageService } from '../../../platform/storage/storage.registry.js'
import { createStorageKey, sanitizeFileName } from '../../../platform/storage/storage.key.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as requirementService from '../../../features/requirements/requirements.service.js'
import * as applicationService from '../applications/applications.service.js'
import * as repository from './document.repository.js'
import { DEFAULT_MAX_FILE_SIZE_BYTES } from '../../../features/documents/document.constants.js'

const STATUS = Object.freeze({
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
})

const getStorage = () => getStorageService()

const uploadDocument = async ({ userId, appId = null, fileName, mimeType, buffer, documentTypeId }) => {
  const storage = getStorage()
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new BadRequestError('The uploaded file is empty.')
  if (buffer.length > DEFAULT_MAX_FILE_SIZE_BYTES) throw new BadRequestError('The uploaded file exceeds the 25 MB limit.')
  let originalName
  try {
    originalName = sanitizeFileName(fileName)
  } catch {
    throw new BadRequestError('A valid X-File-Name header is required.')
  }
  const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  const storageKey = createStorageKey(originalName)
  if (documentTypeId && !(await repository.findDocumentTypeById(documentTypeId))) throw new NotFoundError('Document type not found.')
  await storage.put({ key: storageKey, body: buffer, contentType: mimeType || 'application/octet-stream' })
  try {
    return await repository.createDocument({
      appId,
      documentTypeId: documentTypeId || null,
      ownerId: userId,
      originalName,
      storageKey,
      storageProvider: storage.provider,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: BigInt(buffer.length),
      checksumSha256,
    })
  } catch (error) {
    await storage.delete({ key: storageKey }).catch(() => undefined)
    throw error
  }
}

const listMyDocuments = ({ userId, appId = null }) => repository.listOwnedDocuments({ userId, appId })

const getOwnedDocument = async ({ userId, id, appId = null }) => {
  const document = await repository.findOwnedDocument({ userId, id, appId })
  if (!document) throw new NotFoundError('Document not found.')
  return document
}

const deleteDocument = async ({ userId, id, appId = null }) => {
  const storage = getStorage()
  const document = await getOwnedDocument({ userId, id, appId })
  const deleted = await repository.softDeleteDocument({ id, userId, appId })
  if (deleted.count !== 1) throw new ConflictError('Document was already deleted.')
  await storage.delete({ key: document.storageKey }).catch(() => undefined)
  return { ...document, deletedAt: new Date() }
}

const readDocument = async ({ userId, id, appId = null }) => {
  const storage = getStorage()
  const document = await getOwnedDocument({ userId, id, appId })
  const { body } = await storage.get({ key: document.storageKey })
  return { document, buffer: body }
}

const getApplication = async (id, appId) => {
  const application = await applicationService.getForApplicationDocuments(id, appId)
  if (!application?.workflowInstanceId) return application
  const workflow = await workflowService.getWorkflowInstance(application.workflowInstanceId)
  return { ...application, status: workflow.currentStep.key }
}

const getApplicableRequirements = async (application, appId, db) => {
  if (!application.caseRecord?.id) return []
  return requirementService.listForCase(application.caseRecord.id, { appId, db })
}

const ensureChecklist = async (application, db, requirements = null, appId = application?.appId) => {
  const applicableRequirements = requirements ?? await getApplicableRequirements(application, appId, db)
  if (applicableRequirements.length) {
    await repository.createMany(
      applicableRequirements.map((caseRequirement) => ({
        applicationId: application.id,
        caseRequirementId: caseRequirement.id,
        status: STATUS.PENDING,
      })),
      db
    )
  }
  return applicableRequirements
}

const normalizeRequirement = (caseRequirement) => ({
  ...caseRequirement.requirement,
  required: caseRequirement.requirement.metadata?.required !== false,
})

const normalizeChecklist = (rows, requirements) => {
  const byCaseRequirement = new Map(rows.map((row) => [row.caseRequirementId, row]))
  return requirements.map((caseRequirement) => ({
    ...(byCaseRequirement.get(caseRequirement.id) || {
      id: null,
      applicationId: null,
      caseRequirementId: caseRequirement.id,
      status: STATUS.PENDING,
      receivedAt: null,
      receivedByUserId: null,
      verifiedAt: null,
      verifiedByUserId: null,
      notes: null,
      documentId: null,
      document: null,
    }),
    caseRequirement,
    requirement: normalizeRequirement(caseRequirement),
  }))
}

const getChecklist = async ({ applicationId, appId }) => {
  const application = await getApplication(applicationId, appId)
  const requirements = await ensureChecklist(application, undefined, null, appId)
  const rows = await repository.listByApplicationId(application.id)
  return normalizeChecklist(rows, requirements)
}

const updateCaseRequirementFulfillment = async ({ caseRequirementId, status, notes, db, appId }) => {
  const now = new Date()
  if (status === STATUS.VERIFIED) return requirementService.updateStatus({ id: caseRequirementId, status: 'VERIFIED', notes, verifiedAt: now, db, appId })
  if (status === STATUS.RECEIVED) return requirementService.updateStatus({ id: caseRequirementId, status: 'SUBMITTED', notes, submittedAt: now, verifiedAt: null, db, appId })
  return requirementService.updateStatus({ id: caseRequirementId, status: 'PENDING', notes, submittedAt: null, verifiedAt: null, db, appId })
}

const updateReceiptStatus = async ({ applicationId, appId, requirementId, actorId, status, notes, documentId }) => {
  const application = await getApplication(applicationId, appId)
  if (application.status !== 'RECEIVING') throw new ConflictError('Document receipt can only be recorded while the application is in receiving.')

  return repository.withTransaction(async (tx) => {
    const requirements = await ensureChecklist(application, tx, null, appId)
    const caseRequirement = requirements.find((item) => item.id === requirementId)
    if (!caseRequirement) throw new NotFoundError('Case requirement not found for this application.')
    const existing = await repository.findByApplicationAndCaseRequirement(application.id, caseRequirement.id, tx)
    if (!existing) throw new NotFoundError('Application document checklist item not found.')
    if (![STATUS.RECEIVED, STATUS.VERIFIED, STATUS.REJECTED].includes(status)) throw new ConflictError('Unsupported document receipt status.')

    let attachedDocument = existing.document
    if (documentId !== undefined) attachedDocument = documentId === null ? null : await getOwnedDocument({ userId: actorId, id: documentId, appId })
    if ([STATUS.RECEIVED, STATUS.VERIFIED].includes(status) && !(documentId || existing.documentId)) throw new ConflictError('A shared or application-owned document must be attached before a document can be received or verified.')
    if (status === STATUS.VERIFIED && existing.status !== STATUS.RECEIVED) throw new ConflictError('A document must be received before it can be verified.')

    const cleanNotes = notes?.trim() || null
    const updated = await repository.updateApplicationDocument(existing.id, {
      ...(documentId !== undefined ? { documentId } : {}),
      status,
      notes: cleanNotes,
      ...(status === STATUS.RECEIVED
        ? { receivedAt: existing.receivedAt || new Date(), receivedByUserId: existing.receivedByUserId || actorId, verifiedAt: null, verifiedByUserId: null }
        : status === STATUS.VERIFIED
          ? { verifiedAt: existing.verifiedAt || new Date(), verifiedByUserId: existing.verifiedByUserId || actorId }
          : { receivedAt: null, receivedByUserId: null, verifiedAt: null, verifiedByUserId: null }),
    }, tx)

    await updateCaseRequirementFulfillment({ caseRequirementId: caseRequirement.id, status, notes: cleanNotes, db: tx, appId })
    await recordAudit({
      actorId, appId, action: `OBO_PERMIT_APPLICATION_DOCUMENT_${status}`,
      entityType: 'OboPermitApplicationDocument', entityId: updated.id, before: existing, after: updated,
      metadata: { applicationId: application.id, referenceNumber: application.referenceNumber, caseRequirementId: caseRequirement.id, requirementId: caseRequirement.requirementId, requirementName: caseRequirement.requirement.name, documentId: updated.documentId }, db: tx,
    })
    await publish({
      db: tx, event: `obo.permit_application.document.${status.toLowerCase()}`, entityType: 'OboPermitApplicationDocument',
      entityId: updated.id, actorId,
      context: { appId, applicationId: application.id, caseId: application.caseId, referenceNumber: application.referenceNumber, caseRequirementId: caseRequirement.id, requirementId: caseRequirement.requirementId, requirementName: caseRequirement.requirement.name, documentId: updated.documentId, status },
      idempotencyKey: `obo:application-document:${updated.id}:status:${status}:${updated.receivedAt?.toISOString() || updated.verifiedAt?.toISOString() || Date.now()}`,
    })
    return { ...updated, caseRequirement, requirement: normalizeRequirement(caseRequirement), document: attachedDocument }
  })
}

const validateRequiredDocuments = async ({ applicationId, appId, application = null, db }) => {
  const targetApplication = application ?? await getApplication(applicationId, appId)
  const requirements = await ensureChecklist(targetApplication, db, null, appId)
  const rows = await repository.listByApplicationId(targetApplication.id, db)
  const rowByRequirement = new Map(rows.map((row) => [row.caseRequirementId, row]))
  const missing = requirements
    .filter((requirement) => requirement.requirement.metadata?.required !== false)
    .filter((requirement) => rowByRequirement.get(requirement.id)?.status !== STATUS.VERIFIED)
  if (missing.length) throw new ConflictError(`Required documents are incomplete: ${missing.map((item) => item.requirement.name).join(', ')}.`)
  return true
}

export {
  STATUS,
  uploadDocument,
  listMyDocuments,
  getOwnedDocument,
  deleteDocument,
  readDocument,
  getChecklist,
  updateReceiptStatus,
  validateRequiredDocuments,
  ensureChecklist,
}
