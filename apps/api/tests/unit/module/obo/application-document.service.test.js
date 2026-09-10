import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  planPermit: { getForReceiving: vi.fn() },
  requirements: { listForFormVersion: vi.fn() },
  forms: { evaluateCondition: vi.fn() },
  repository: {
    listByApplicationId: vi.fn(),
    findByApplicationAndRequirement: vi.fn(),
    createMany: vi.fn(),
    updateStatus: vi.fn(),
  },
  audit: { recordAudit: vi.fn() },
}))

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.service.js', () => mocks.planPermit)
vi.mock('../../../../src/platform/documents/document-requirement.service.js', () => mocks.requirements)
vi.mock('../../../../src/platform/forms/form.service.js', () => mocks.forms)
vi.mock('../../../../src/modules/obo/application-documents/application-document.repository.js', () => mocks.repository)
vi.mock('../../../../src/platform/audit/audit.service.js', () => mocks.audit)

const { getChecklist, updateReceiptStatus, validateRequiredDocuments, STATUS } = await import('../../../../src/modules/obo/application-documents/application-document.service.js')

describe('OBO application document checklist service', () => {
  const application = {
    id: 'application-1',
    referenceNumber: 'OBO-0001',
    formVersionId: 'form-version-1',
    formValues: { projectType: 'BUILDING' },
    status: 'RECEIVING',
  }
  const requirements = [
    { id: 'requirement-1', name: 'Building Plan', required: true, condition: null },
    { id: 'requirement-2', name: 'Site Plan', required: false, condition: { field: 'projectType' } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.planPermit.getForReceiving.mockResolvedValue(application)
    mocks.requirements.listForFormVersion.mockResolvedValue(requirements)
    mocks.forms.evaluateCondition.mockReturnValue(true)
    mocks.repository.createMany.mockResolvedValue({ count: requirements.length })
    mocks.repository.listByApplicationId.mockResolvedValue([])
    mocks.repository.findByApplicationAndRequirement.mockResolvedValue({ id: 'receipt-1', requirementId: 'requirement-1', status: STATUS.PENDING, notes: null })
    mocks.repository.updateStatus.mockResolvedValue({ id: 'receipt-1', requirementId: 'requirement-1', status: STATUS.RECEIVED })
    mocks.audit.recordAudit.mockResolvedValue(undefined)
  })

  it('builds the checklist from the application form version requirements', async () => {
    const result = await getChecklist({ applicationId: application.id })

    expect(mocks.requirements.listForFormVersion).toHaveBeenCalledWith(application.formVersionId, undefined)
    expect(mocks.repository.createMany).toHaveBeenCalled()
    expect(result).toHaveLength(2)
    expect(result[0].status).toBe(STATUS.PENDING)
  })

  it('records a received document with actor and note', async () => {
    const result = await updateReceiptStatus({
      applicationId: application.id,
      requirementId: 'requirement-1',
      actorId: 42,
      status: STATUS.RECEIVED,
      notes: 'Physical copy checked.',
    })

    expect(mocks.repository.updateStatus).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      status: STATUS.RECEIVED,
      notes: 'Physical copy checked.',
      receivedByUserId: 42,
    }))
    expect(mocks.audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 42,
      action: 'OBO_PERMIT_APPLICATION_DOCUMENT_RECEIVED',
      entityId: 'receipt-1',
    }))
    expect(result.status).toBe(STATUS.RECEIVED)
  })

  it('rejects inspection acceptance when a required document is missing', async () => {
    await expect(validateRequiredDocuments({ applicationId: application.id })).rejects.toThrow(/Building Plan/)
  })

  it('passes required-document validation after all required documents are received', async () => {
    mocks.repository.listByApplicationId.mockResolvedValue([
      { requirementId: 'requirement-1', status: STATUS.RECEIVED },
      { requirementId: 'requirement-2', status: STATUS.PENDING },
    ])

    await expect(validateRequiredDocuments({ applicationId: application.id })).resolves.toBe(true)
  })
})
