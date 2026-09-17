import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({ findPersonByUserId: vi.fn(), findById: vi.fn(), findOwnedByClient: vi.fn(), listByClient: vi.fn(), create: vi.fn(), update: vi.fn(), findPersonNotificationContext: vi.fn(), withTransaction: vi.fn() }))
const permitTypeService = vi.hoisted(() => ({ getPermitTypeById: vi.fn(), getRequirementIds: vi.fn() }))
const requirementService = vi.hoisted(() => ({ attachDefinitionsToCase: vi.fn(), listForCase: vi.fn(), updateStatus: vi.fn() }))
const caseService = vi.hoisted(() => ({ getOrCreateType: vi.fn(), createRecord: vi.fn() }))
const participantService = vi.hoisted(() => ({ add: vi.fn(), list: vi.fn(), remove: vi.fn() }))
const professionalService = vi.hoisted(() => ({ getForReference: vi.fn() }))
const professionalReferenceService = vi.hoisted(() => ({ validateProfessionalReferences: vi.fn(), buildProfessionalSnapshots: vi.fn() }))
const formService = vi.hoisted(() => ({ getFormById: vi.fn(), getFormVersionById: vi.fn(), validateFormValues: vi.fn() }))
const workflowService = vi.hoisted(() => ({ getWorkflowInstance: vi.fn(), startWorkflow: vi.fn(), transitionWorkflow: vi.fn() }))
const auditService = vi.hoisted(() => ({ recordAudit: vi.fn() }))
const eventBus = vi.hoisted(() => ({ publish: vi.fn() }))
const appointmentService = vi.hoisted(() => ({ getAppointmentForReference: vi.fn() }))
const taskService = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), update: vi.fn() }))
const documentsService = vi.hoisted(() => ({ getOwnedDocument: vi.fn() }))

vi.mock('../../../src/apps/obo/plan-permits/plan-permit.repository.js', () => repository)
vi.mock('../../../src/apps/obo/permit-types/permit-type.service.js', () => permitTypeService)
vi.mock('../../../src/apps/obo/permit-types/permit-type-requirement.service.js', () => ({ getRequirementIds: permitTypeService.getRequirementIds }))
vi.mock('../../../src/features/requirements/requirements.service.js', () => requirementService)
vi.mock('../../../src/features/cases/cases.service.js', () => caseService)
vi.mock('../../../src/features/participants/participants.application.service.js', () => ({ default: participantService }))
vi.mock('../../../src/apps/obo/professionals/professional.service.js', () => professionalService)
vi.mock('../../../src/apps/obo/professionals/professional-reference.service.js', () => professionalReferenceService)
vi.mock('../../../src/platform/forms/form.service.js', () => formService)
vi.mock('../../../src/platform/workflow/workflow.service.js', () => workflowService)
vi.mock('../../../src/platform/audit/audit.service.js', () => auditService)
vi.mock('../../../src/platform/event-bus/event-bus.js', () => eventBus)
vi.mock('../../../src/features/appointments/appointment.service.js', () => appointmentService)
vi.mock('../../../src/features/tasks/tasks.service.js', () => taskService)
vi.mock('../../../src/features/documents/document.service.js', () => documentsService)
vi.mock('../../../src/apps/obo/application-documents/application-document.repository.js', () => repository)

const service = await import('../../../src/apps/obo/plan-permits/plan-permit.service.js')
const { resolveAndValidateForm } = await import('../../../src/apps/obo/plan-permits/plan-permit.form.js')
const { createApplicationValidator, updateApplicationValidator } = await import('../../../src/apps/obo/plan-permits/plan-permit.validation.js')
const documentService = await import('../../../src/apps/obo/application-documents/application-document.service.js')

const person = { id: 'person-1', userId: 'user-1', email: 'client@example.com' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }
const application = { id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', permitType, formValues: {}, submissionAppointment: { appointmentId: 'appointment-1' } }

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation(async (callback) => callback({ tx: true }))
  repository.findPersonByUserId.mockResolvedValue(person)
  repository.findOwnedByClient.mockResolvedValue(application)
  repository.findById.mockResolvedValue(application)
  permitTypeService.getPermitTypeById.mockResolvedValue(permitType)
  permitTypeService.getRequirementIds.mockResolvedValue(['requirement-1', 'requirement-2'])
  requirementService.attachDefinitionsToCase.mockResolvedValue([])
  caseService.getOrCreateType.mockResolvedValue({ id: 'case-type-1', key: 'obo-permit-application' })
  caseService.createRecord.mockResolvedValue({ id: 'case-1', caseNumber: 'CASE-1' })
  participantService.add.mockResolvedValue({ id: 'participant-1' })
  professionalService.getForReference.mockResolvedValue({ id: 'professional-a', personId: 'professional-person-1', professionalRole: 'ARCHITECT', status: 'VERIFIED', person: { isActive: true } })
  repository.create.mockResolvedValue({ id: 'application-1', referenceNumber: 'OBO-1', status: 'DRAFT', permitType, workflowInstanceId: 'workflow-1', caseId: 'case-1' })
  repository.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', permitType, caseId: 'case-1' })
  workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  formService.getFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 1, status: 'PUBLISHED', fields: [] })
  formService.validateFormValues.mockResolvedValue({ valid: true, formVersionId: 'form-version-1' })
  appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED' })
  taskService.create.mockResolvedValue({ id: 'task-1' })
  eventBus.publish.mockResolvedValue(undefined)
  auditService.recordAudit.mockResolvedValue({ id: 'audit-1' })
  professionalReferenceService.validateProfessionalReferences.mockResolvedValue(true)
  professionalReferenceService.buildProfessionalSnapshots.mockResolvedValue({ architect: { professionalId: 'professional-a', name: 'John Doe', registrationNumber: 'REG-1', prcId: 'PRC-1', ptrNumber: 'PTR-1', role: 'ARCHITECT' } })
})

describe('OBO plan permit service', () => {
  it('creates a draft through application-scoped service boundaries', async () => {
    await expect(service.createApplication({ appId: 'obo-app', userId: 'user-1', permitTypeId: 'permit-1', formValues: { projectAddress: 'Manila' } })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT', workflowInstanceId: 'workflow-1' })
    expect(permitTypeService.getPermitTypeById).toHaveBeenCalledWith('permit-1', 'obo-app')
    expect(permitTypeService.getRequirementIds).toHaveBeenCalledWith('permit-1', 'obo-app', expect.anything())
    expect(requirementService.attachDefinitionsToCase).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', caseId: 'case-1', requirementIds: ['requirement-1', 'requirement-2'], db: expect.anything() }))
    expect(caseService.createRecord).toHaveBeenCalledWith(expect.objectContaining({ caseTypeId: 'case-type-1', title: 'Building Permit Application' }), { appId: 'obo-app', db: expect.anything() })
    expect(participantService.add).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', appId: 'obo-app' }))
  })

  it('associates verified professionals from form references as case participants', async () => {
    repository.findOwnedByClient.mockResolvedValue({ id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', permitType: { ...permitType, formId: 'form-1' }, formVersionId: 'form-version-1', formVersion: { id: 'form-version-1', version: 1, fields: [] }, formValues: { architect: { professionalId: 'professional-1' } } })
    await service.submit({ id: 'application-1', appId: 'obo-app', userId: 'user-1' })
    expect(professionalReferenceService.validateProfessionalReferences).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', formVersion: expect.anything(), formValues: expect.anything() }))
    expect(professionalReferenceService.buildProfessionalSnapshots).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app' }))
    expect(professionalService.getForReference).toHaveBeenCalledWith('professional-a', 'obo-app')
    expect(participantService.add).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', roleKey: 'PROFESSIONAL', appId: 'obo-app' }), expect.anything())
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1' }), { appId: 'obo-app', db: expect.anything() })
  })
})

describe('OBO plan permit form resolution', () => {
  it('passes application context when resolving a form version', async () => {
    const permit = { ...permitType, formId: 'form-1' }
    await resolveAndValidateForm({ permitType: permit, formVersionId: 'version-1', formValues: {}, appId: 'obo-app' })
    expect(formService.getFormVersionById).toHaveBeenCalledWith('version-1', 'obo-app')
  })
  it('resolves an explicitly selected published version instead of the latest version', async () => {
    formService.getFormVersionById.mockResolvedValue({ id: 'version-2', formId: 'form-1', version: 2, status: 'PUBLISHED', fields: [] })
    await resolveAndValidateForm({ permitType: { ...permitType, formId: 'form-1' }, formVersionId: 'version-2', formValues: {}, appId: 'obo-app' })
    expect(formService.getFormVersionById).toHaveBeenCalledWith('version-2', 'obo-app')
    expect(formService.validateFormValues).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', version: 2 }))
  })
})

void createApplicationValidator
void updateApplicationValidator
void documentService
