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
const formService = vi.hoisted(() => ({ getFormById: vi.fn(), getFormVersionById: vi.fn(), validateFormValues: vi.fn() }))
const workflowService = vi.hoisted(() => ({ getWorkflowInstance: vi.fn(), startWorkflow: vi.fn(), transitionWorkflow: vi.fn() }))
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
  repository.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', permitType, formValues: {}, submissionAppointment: { appointmentId: 'appointment-1' } })
  repository.findPersonNotificationContext.mockResolvedValue(null)
  repository.findById.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', permitType })
  permitTypeService.getPermitTypeById.mockResolvedValue(permitType)
  caseService.getOrCreateType.mockResolvedValue({ id: 'case-type-1', key: 'obo-permit-application' })
  caseService.createRecord.mockResolvedValue({ id: 'case-1', caseNumber: 'CASE-20260910-ABC12345' })
  repository.create.mockResolvedValue({ id: 'application-1', referenceNumber: 'OBO-20260910-ABC12345', status: 'DRAFT', permitType, workflowInstanceId: 'workflow-1' })
  repository.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', permitType })
  workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  formService.getFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 1, status: 'PUBLISHED', fields: [] })
  formService.validateFormValues.mockResolvedValue({ valid: true, formVersionId: 'form-version-1' })
  appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED' })
})

describe('OBO plan permit service', () => {
  it('creates a draft through Permit Type and Case service boundaries', async () => {
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', formValues: { projectAddress: 'Manila' } })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT', workflowInstanceId: 'workflow-1' })
    expect(permitTypeService.getPermitTypeById).toHaveBeenCalledWith('permit-1')
    expect(caseService.getOrCreateType).toHaveBeenCalledWith(expect.objectContaining({ key: 'obo-permit-application', db: expect.anything() }))
    expect(caseService.createRecord).toHaveBeenCalledWith(expect.objectContaining({ caseTypeId: 'case-type-1', title: 'Building Permit Application', status: 'OPEN', createdByUserId: 'user-1' }), { db: expect.anything() })
    expect(caseService.createRecord.mock.calls[0][0]).not.toHaveProperty('caseNumber')
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', permitTypeId: 'permit-1' }), expect.anything())
  })

  it('rejects a missing Permit Type before persistence', async () => {
    permitTypeService.getPermitTypeById.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'missing', formValues: {} })).rejects.toThrow('Active permit type not found')
    expect(repository.create).not.toHaveBeenCalled()
    expect(caseService.createRecord).not.toHaveBeenCalled()
  })

  it('uses Platform Workflow and Appointment services for hydration', async () => {
    await service.getMine({ id: 'application-1', userId: 'user-1' })
    expect(workflowService.getWorkflowInstance).toHaveBeenCalledWith('workflow-1')
    expect(appointmentService.getAppointmentForReference).toHaveBeenCalledWith({ id: 'appointment-1', db: undefined })
  })

  it('does not expose Receiving decision persistence from the Plan Permit repository', () => {
    expect(repository).not.toHaveProperty('addDecision')
  })
})
