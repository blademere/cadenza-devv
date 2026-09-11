import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  planPermit: { getForApplicationDocuments: vi.fn() },
  requirements: { listForCase: vi.fn(), updateStatus: vi.fn() },
  documents: { getOwnedDocument: vi.fn() },
  repository: { listByApplicationId: vi.fn(), findByApplicationAndCaseRequirement: vi.fn(), createMany: vi.fn(), update: vi.fn(), withTransaction: vi.fn() },
  audit: { recordAudit: vi.fn() },
  eventBus: { publish: vi.fn() },
}))

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.service.js', () => mocks.planPermit)
vi.mock('../../../../src/features/requirements/requirements.service.js', () => mocks.requirements)
vi.mock('../../../../src/features/documents/document.service.js', () => mocks.documents)
vi.mock('../../../../src/modules/obo/application-documents/application-document.repository.js', () => mocks.repository)
vi.mock('../../../../src/platform/audit/audit.service.js', () => mocks.audit)
vi.mock('../../../../src/platform/event-bus/event-bus.js', () => mocks.eventBus)

const { getChecklist, updateReceiptStatus, validateRequiredDocuments, STATUS } = await import('../../../../src/modules/obo/application-documents/application-document.service.js')

describe('OBO application document checklist service', () => {
  const application = { id: 'application-1', referenceNumber: 'OBO-0001', status: 'RECEIVING', caseId: 'case-1', caseRecord: { id: 'case-1' } }
  const requirements = [
    { id: 'case-requirement-1', requirementId: 'requirement-1', requirement: { id: 'requirement-1', name: 'Building Plan', metadata: { required: true } } },
    { id: 'case-requirement-2', requirementId: 'requirement-2', requirement: { id: 'requirement-2', name: 'Site Plan', metadata: { required: false } } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.planPermit.getForApplicationDocuments.mockResolvedValue(application)
    mocks.requirements.listForCase.mockResolvedValue(requirements)
    mocks.requirements.updateStatus.mockResolvedValue({ id: 'case-requirement-1', status: 'SUBMITTED' })
    mocks.documents.getOwnedDocument.mockResolvedValue({ id: 'document-1', originalName: 'building-plan.pdf' })
    mocks.repository.createMany.mockResolvedValue({ count: requirements.length })
    mocks.repository.listByApplicationId.mockResolvedValue([])
    mocks.repository.findByApplicationAndCaseRequirement.mockResolvedValue({ id: 'receipt-1', caseRequirementId: 'case-requirement-1', status: STATUS.PENDING, documentId: null, document: null, notes: null })
    mocks.repository.update.mockResolvedValue({ id: 'receipt-1', caseRequirementId: 'case-requirement-1', status: STATUS.RECEIVED, documentId: 'document-1', document: { id: 'document-1' } })
    mocks.repository.withTransaction.mockImplementation(async (callback) => callback('tx'))
    mocks.audit.recordAudit.mockResolvedValue(undefined)
    mocks.eventBus.publish.mockResolvedValue(undefined)
  })

  it('builds the checklist from the case requirements owned by the shared requirements feature', async () => {
    const result = await getChecklist({ applicationId: application.id })
    expect(mocks.planPermit.getForApplicationDocuments).toHaveBeenCalledWith(application.id)
    expect(mocks.requirements.listForCase).toHaveBeenCalledWith(application.caseRecord.id, undefined)
    expect(mocks.repository.createMany).toHaveBeenCalledWith([
      { applicationId: application.id, caseRequirementId: 'case-requirement-1', status: STATUS.PENDING },
      { applicationId: application.id, caseRequirementId: 'case-requirement-2', status: STATUS.PENDING },
    ], undefined)
    expect(result).toHaveLength(2)
  })

  it('receives a shared document, updates the case requirement fulfillment, records audit, and emits an event', async () => {
    const result = await updateReceiptStatus({ applicationId: application.id, requirementId: 'case-requirement-1', actorId: 42, status: STATUS.RECEIVED, documentId: 'document-1', notes: 'Physical copy checked.' })
    expect(mocks.documents.getOwnedDocument).toHaveBeenCalledWith({ userId: 42, id: 'document-1' })
    expect(mocks.repository.update).toHaveBeenCalledWith('receipt-1', expect.objectContaining({ status: STATUS.RECEIVED, documentId: 'document-1', notes: 'Physical copy checked.', receivedByUserId: 42 }), 'tx')
    expect(mocks.requirements.updateStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'case-requirement-1', status: 'SUBMITTED', db: 'tx' }))
    expect(mocks.audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 42, action: 'OBO_PERMIT_APPLICATION_DOCUMENT_RECEIVED', entityId: 'receipt-1', db: 'tx' }))
    expect(mocks.eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'obo.permit_application.document.received', entityId: 'receipt-1', db: 'tx' }))
    expect(result.status).toBe(STATUS.RECEIVED)
  })

  it('emits a verified event when a received document is verified', async () => {
    mocks.repository.findByApplicationAndCaseRequirement.mockResolvedValue({ id: 'receipt-1', caseRequirementId: 'case-requirement-1', status: STATUS.RECEIVED, documentId: 'document-1', document: { id: 'document-1' }, notes: null })
    mocks.repository.update.mockResolvedValue({ id: 'receipt-1', caseRequirementId: 'case-requirement-1', status: STATUS.VERIFIED, documentId: 'document-1', document: { id: 'document-1' } })
    mocks.requirements.updateStatus.mockResolvedValue({ id: 'case-requirement-1', status: 'VERIFIED' })
    await updateReceiptStatus({ applicationId: application.id, requirementId: 'case-requirement-1', actorId: 42, status: STATUS.VERIFIED })
    expect(mocks.eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'obo.permit_application.document.verified', entityId: 'receipt-1', db: 'tx' }))
  })

  it('rejects inspection acceptance when a required document is not verified', async () => {
    await expect(validateRequiredDocuments({ applicationId: application.id })).rejects.toThrow(/Building Plan/)
  })

  it('passes required-document validation after all required documents are verified', async () => {
    mocks.repository.listByApplicationId.mockResolvedValue([{ caseRequirementId: 'case-requirement-1', status: STATUS.VERIFIED }, { caseRequirementId: 'case-requirement-2', status: STATUS.PENDING }])
    await expect(validateRequiredDocuments({ applicationId: application.id })).resolves.toBe(true)
  })
})
