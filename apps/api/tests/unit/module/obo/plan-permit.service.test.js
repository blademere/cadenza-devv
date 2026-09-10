import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findPersonByUserId: vi.fn(),
  findById: vi.fn(),
  findOwnedByClient: vi.fn(),
  listByClient: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findPersonNotificationContext: vi.fn(),
  withTransaction: vi.fn(),
}))
const permitTypeService = vi.hoisted(() => ({ getPermitTypeById: vi.fn() }))
const caseService = vi.hoisted(() => ({ getOrCreateType: vi.fn(), createRecord: vi.fn() }))
const formService = vi.hoisted(() => ({ getFormById: vi.fn(), getFormVersionById: vi.fn(), getFormVersion: vi.fn(), validateFormValues: vi.fn() }))
const workflowService = vi.hoisted(() => ({ startWorkflow: vi.fn(), transitionWorkflow: vi.fn(), getWorkflowInstance: vi.fn() }))
const auditService = vi.hoisted(() => ({ recordAudit: vi.fn() }))
const appointmentService = vi.hoisted(() => ({ getAppointmentForReference: vi.fn() }))

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', () => repository)
vi.mock('../../../../src/modules/obo/permit-types/permit-type.service.js', () => permitTypeService)
vi.mock('../../../../src/features/cases/cases.service.js', () => caseService)
vi.mock('../../../../src/platform/forms/form.service.js', () => formService)
vi.mock('../../../../src/platform/workflow/workflow.service.js', () => workflowService)
vi.mock('../../../../src/platform/audit/audit.service.js', () => auditService)
vi.mock('../../../../src/features/appointments/appointment.service.js', () => appointmentService)
vi.mock('../../../../src/modules/obo/professionals/professional-reference.service.js', () => ({ validateProfessionalReferences: vi.fn(), buildProfessionalSnapshots: vi.fn() }))

const service = await import('../../../../src/modules/obo/plan-permits/plan-permit.service.js')

const person = { id: 'person-1', userId: 'user-1', email: 'client@example.com' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation(async (callback) => callback({ tx: true }))
  repository.findPersonByUserId.mockResolvedValue(person)
  repository.findOwnedByClient.mockResolvedValue(null)
  repository.findPersonNotificationContext.mockResolvedValue(null)
  repository.findById.mockResolvedValue(null)
  permitTypeService.getPermitTypeById.mockResolvedValue(permitType)
  caseService.getOrCreateType.mockResolvedValue({ id: 'case-type-1', key: 'obo-permit-application' })
  caseService.createRecord.mockResolvedValue({ id: 'case-1' })
  repository.create.mockResolvedValue({ id: 'application-1', referenceNumber: 'OBO-20260910-ABC12345', status: 'DRAFT', permitType })
  repository.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', permitType })
  workflowService.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  formService.validateFormValues.mockResolvedValue({ valid: true })
  formService.getFormVersion.mockResolvedValue({ id: 'form-version-1', version: 1, fields: [] })
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  formService.getFormVersionById.mockResolvedValue({ id: 'form-version-1', version: 1, fields: [] })
  appointmentService.getAppointmentForReference.mockResolvedValue(null)
})

describe('OBO plan permit service', () => {
  it('creates a draft through Permit Type and Case service boundaries', async () => {
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', formValues: { projectAddress: 'Manila' } })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT', workflowInstanceId: 'workflow-1' })
    expect(permitTypeService.getPermitTypeById).toHaveBeenCalledWith('permit-1')
    expect(caseService.getOrCreateType).toHaveBeenCalledWith(expect.objectContaining({ key: 'obo-permit-application', db: expect.anything() }))
    expect(caseService.createRecord).toHaveBeenCalledWith(expect.objectContaining({ caseTypeId: 'case-type-1', caseNumber: expect.any(String) }), { db: expect.anything() })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', permitTypeId: 'permit-1' }), expect.anything())
  })

  it('rejects a missing Permit Type before persistence', async () => {
    permitTypeService.getPermitTypeById.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'missing', formValues: {} })).rejects.toThrow('Active permit type not found')
    expect(repository.create).not.toHaveBeenCalled()
    expect(caseService.createRecord).not.toHaveBeenCalled()
  })

  it('does not expose Receiving decision persistence from the Plan Permit repository', () => {
    expect(repository).not.toHaveProperty('addDecision')
  })
})