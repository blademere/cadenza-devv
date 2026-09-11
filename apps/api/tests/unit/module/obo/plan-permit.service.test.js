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
const permitTypeRequirementService = vi.hoisted(() => ({ getRequirementIds: vi.fn() }))
const requirementService = vi.hoisted(() => ({ attachDefinitionsToCase: vi.fn() }))
const caseService = vi.hoisted(() => ({ getOrCreateType: vi.fn(), createRecord: vi.fn() }))
const participantService = vi.hoisted(() => ({ add: vi.fn(), list: vi.fn(), remove: vi.fn() }))
const professionalService = vi.hoisted(() => ({ getForReference: vi.fn() }))
const formService = vi.hoisted(() => ({ getFormById: vi.fn(), getFormVersionById: vi.fn(), validateFormValues: vi.fn() }))
const workflowService = vi.hoisted(() => ({ getWorkflowInstance: vi.fn(), startWorkflow: vi.fn(), transitionWorkflow: vi.fn() }))
const auditService = vi.hoisted(() => ({ recordAudit: vi.fn() }))
const appointmentService = vi.hoisted(() => ({ getAppointmentForReference: vi.fn() }))
const taskService = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), update: vi.fn() }))

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', () => repository)
vi.mock('../../../../src/modules/obo/permit-types/permit-type.service.js', () => permitTypeService)
vi.mock('../../../../src/modules/obo/permit-types/permit-type-requirement.service.js', () => permitTypeRequirementService)
vi.mock('../../../../src/features/requirements/requirements.service.js', () => requirementService)
vi.mock('../../../../src/features/cases/cases.service.js', () => caseService)
vi.mock('../../../../src/features/participants/participants.service.js', () => ({ default: participantService }))
vi.mock('../../../../src/modules/obo/professionals/professional.service.js', () => professionalService)
vi.mock('../../../../src/platform/forms/form.service.js', () => formService)
vi.mock('../../../../src/platform/workflow/workflow.service.js', () => workflowService)
vi.mock('../../../../src/platform/audit/audit.service.js', () => auditService)
vi.mock('../../../../src/features/appointments/appointment.service.js', () => appointmentService)
vi.mock('../../../../src/features/tasks/tasks.service.js', () => taskService)
vi.mock('../../../../src/modules/obo/professionals/professional-reference.service.js', () => ({ validateProfessionalReferences: vi.fn(), buildProfessionalSnapshots: vi.fn() }))

const service = await import('../../../../src/modules/obo/plan-permits/plan-permit.service.js')

const person = { id: 'person-1', userId: 'user-1', email: 'client@example.com' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation(async (callback) => callback({ tx: true }))
  repository.findPersonByUserId.mockResolvedValue(person)
  repository.findOwnedByClient.mockResolvedValue({ id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', permitType, formValues: {}, submissionAppointment: { appointmentId: 'appointment-1' } })
  repository.findPersonNotificationContext.mockResolvedValue(null)
  repository.findById.mockResolvedValue({ id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', permitType })
  permitTypeService.getPermitTypeById.mockResolvedValue(permitType)
  permitTypeRequirementService.getRequirementIds.mockResolvedValue(['requirement-1', 'requirement-2'])
  requirementService.attachDefinitionsToCase.mockResolvedValue([])
  caseService.getOrCreateType.mockResolvedValue({ id: 'case-type-1', key: 'obo-permit-application' })
  caseService.createRecord.mockResolvedValue({ id: 'case-1', caseNumber: 'CASE-20260910-ABC12345' })
  participantService.add.mockResolvedValue({ id: 'participant-1' })
  professionalService.getForReference.mockResolvedValue({ id: 'professional-1', personId: 'professional-person-1', professionalRole: 'ARCHITECT' })
  repository.create.mockResolvedValue({ id: 'application-1', referenceNumber: 'OBO-20260910-ABC12345', status: 'DRAFT', permitType, workflowInstanceId: 'workflow-1', caseId: 'case-1' })
  repository.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', permitType, caseId: 'case-1' })
  workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1' })
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  formService.getFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 1, status: 'PUBLISHED', fields: [] })
  formService.validateFormValues.mockResolvedValue({ valid: true, formVersionId: 'form-version-1' })
  appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED' })
  taskService.create.mockResolvedValue({ id: 'task-1' })
})

describe('OBO plan permit service', () => {
  it('creates a draft through Permit Type, Case, requirements, and Participant service boundaries', async () => {
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', formValues: { projectAddress: 'Manila' } })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT', workflowInstanceId: 'workflow-1' })
    expect(permitTypeService.getPermitTypeById).toHaveBeenCalledWith('permit-1')
    expect(permitTypeRequirementService.getRequirementIds).toHaveBeenCalledWith('permit-1', expect.anything())
    expect(requirementService.attachDefinitionsToCase).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', requirementIds: ['requirement-1', 'requirement-2'], metadata: { source: 'obo-plan-permit', permitTypeId: 'permit-1' }, db: expect.anything() }))
    expect(caseService.getOrCreateType).toHaveBeenCalledWith(expect.objectContaining({ key: 'obo-permit-application', db: expect.anything() }))
    expect(caseService.createRecord).toHaveBeenCalledWith(expect.objectContaining({ caseTypeId: 'case-type-1', title: 'Building Permit Application', status: 'OPEN', createdByUserId: 'user-1' }), { db: expect.anything() })
    expect(caseService.createRecord.mock.calls[0][0]).not.toHaveProperty('caseNumber')
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', permitTypeId: 'permit-1' }), expect.anything())
    expect(participantService.add).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', personId: 'person-1', roleKey: 'APPLICANT', isPrimary: true, db: expect.anything() }))
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

  it('associates verified professionals from form references as case participants', async () => {
    const professionalReferenceService = await import('../../../../src/modules/obo/professionals/professional-reference.service.js')
    professionalReferenceService.buildProfessionalSnapshots.mockResolvedValue({
      architect: { professionalId: 'professional-1', name: 'John Doe', professionalRole: 'ARCHITECT' },
      engineers: [
        { professionalId: 'professional-2', name: 'Jane Doe', professionalRole: 'CIVIL_ENGINEER' },
        { professionalId: 'professional-1', name: 'John Doe', professionalRole: 'ARCHITECT' },
      ],
    })
    professionalService.getForReference
      .mockResolvedValueOnce({ id: 'professional-1', personId: 'professional-person-1', professionalRole: 'ARCHITECT' })
      .mockResolvedValueOnce({ id: 'professional-2', personId: 'professional-person-2', professionalRole: 'CIVIL_ENGINEER' })
      .mockResolvedValueOnce({ id: 'professional-1', personId: 'professional-person-1', professionalRole: 'ARCHITECT' })

    repository.findOwnedByClient.mockResolvedValue({
      id: 'application-1',
      caseId: 'case-1',
      workflowInstanceId: 'workflow-1',
      clientPersonId: 'person-1',
      permitType: { ...permitType, formId: 'form-1' },
      formVersionId: 'form-version-1',
      formVersion: { id: 'form-version-1', formId: 'form-1', version: 1, fields: [] },
      formValues: { architect: 'professional-1', engineers: ['professional-2', 'professional-1'] },
      submissionAppointment: null,
    })
    repository.update.mockResolvedValue({ id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', permitType })

    await service.submit({ id: 'application-1', userId: 'user-1' })

    expect(participantService.add).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', personId: 'professional-person-1', roleKey: 'PROFESSIONAL', db: expect.anything() }))
    expect(participantService.add).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', personId: 'professional-person-2', roleKey: 'PROFESSIONAL', db: expect.anything() }))
    expect(participantService.add.mock.calls.filter(([args]) => args.roleKey === 'PROFESSIONAL')).toHaveLength(2)
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', title: 'Review permit application', metadata: expect.objectContaining({ taskType: 'REVIEW_APPLICATION', applicationId: 'application-1' }) }), { db: expect.anything() })
  })

  it('does not expose Receiving decision persistence from the Plan Permit repository', () => {
    expect(repository).not.toHaveProperty('addDecision')
  })
})
