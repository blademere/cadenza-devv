import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.repository.js')
vi.mock('../../../../src/modules/obo/permit-types/permit-type.service.js')
vi.mock('../../../../src/modules/obo/professionals/professional-reference.service.js')
vi.mock('../../../../src/modules/obo/professionals/professional.service.js')
vi.mock('../../../../src/platform/forms/form.service.js')
vi.mock('../../../../src/platform/workflow/workflow.service.js')
vi.mock('../../../../src/platform/audit/audit.service.js')
vi.mock('../../../../src/features/appointments/appointment.service.js')
vi.mock('../../../../src/features/participants/participants.service.js')
vi.mock('../../../../src/features/tasks/tasks.service.js')

const repository = await import('../../../../src/modules/obo/plan-permits/plan-permit.repository.js')
const permitTypeService = await import('../../../../src/modules/obo/permit-types/permit-type.service.js')
const professionalReferenceService = await import('../../../../src/modules/obo/professionals/professional-reference.service.js')
const professionalService = await import('../../../../src/modules/obo/professionals/professional.service.js')
const formService = await import('../../../../src/platform/forms/form.service.js')
const workflowService = await import('../../../../src/platform/workflow/workflow.service.js')
const auditService = await import('../../../../src/platform/audit/audit.service.js')
const appointmentService = await import('../../../../src/features/appointments/appointment.service.js')
const participantService = await import('../../../../src/features/participants/participants.service.js')
const taskService = await import('../../../../src/features/tasks/tasks.service.js')
const service = await import('../../../../src/modules/obo/plan-permits/plan-permit.service.js')

const spies = {
  findPersonByUserId: repository.findPersonByUserId,
  findOwnedByClient: repository.findOwnedByClient,
  findById: repository.findById,
  update: repository.update,
  withTransaction: repository.withTransaction,
  findPersonNotificationContext: repository.findPersonNotificationContext,
  getPermitTypeById: permitTypeService.getPermitTypeById,
  getFormById: formService.getFormById,
  getFormVersionById: formService.getFormVersionById,
  validateFormValues: formService.validateFormValues,
  getWorkflowInstance: workflowService.getWorkflowInstance,
  transitionWorkflow: workflowService.transitionWorkflow,
  recordAudit: auditService.recordAudit,
  validateProfessionalReferences: professionalReferenceService.validateProfessionalReferences,
  buildProfessionalSnapshots: professionalReferenceService.buildProfessionalSnapshots,
  getForReference: professionalService.getForReference,
  getAppointmentForReference: appointmentService.getAppointmentForReference,
  addParticipant: participantService.default?.add,
  createTask: taskService.create,
}

const person = { id: 'person-1', userId: 'user-1' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }

beforeEach(() => {
  spies.withTransaction.mockImplementation(async (callback) => callback({ tx: true }))
  spies.findPersonByUserId.mockResolvedValue(person)
  spies.getPermitTypeById.mockResolvedValue(permitType)
  spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', referenceNumber: 'BP-1', formVersionId: 'form-version-1', formVersion: { id: 'form-version-1', version: 2 }, permitType, formValues: { architect: 'professional-a', projectAddress: 'Old address' } })
  spies.findById.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
  spies.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  spies.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  spies.getFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 2, status: 'PUBLISHED', fields: [] })
  spies.validateFormValues.mockResolvedValue({ valid: true, formVersionId: 'form-version-1' })
  spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1' })
  spies.findPersonNotificationContext.mockResolvedValue(null)
  spies.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', formVersionId: 'form-version-1', permitType })
  spies.recordAudit.mockResolvedValue({ id: 'audit-1' })
  spies.validateProfessionalReferences.mockResolvedValue(true)
  spies.buildProfessionalSnapshots.mockResolvedValue({ architect: { professionalId: 'professional-a', name: 'John Doe', registrationNumber: 'REG-1', prcId: 'PRC-1', ptrNumber: 'PTR-1', role: 'ARCHITECT' } })
  spies.getForReference.mockResolvedValue({ id: 'professional-a', personId: 'professional-person-a', professionalRole: 'ARCHITECT' })
  spies.getAppointmentForReference.mockResolvedValue(null)
  spies.addParticipant?.mockResolvedValue({ id: 'participant-1' })
  spies.createTask.mockResolvedValue({ id: 'task-1' })
})

afterEach(() => vi.clearAllMocks())

describe('OBO plan permit auditability', () => {
  it('audits each changed draft field with form version and actor context', async () => {
    await service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: { architect: 'professional-b', projectAddress: 'New address' } })
    expect(spies.recordAudit).toHaveBeenCalledTimes(2)
    expect(spies.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1', action: 'OBO_PERMIT_APPLICATION_FORM_FIELD_UPDATED', entityType: 'OboPermitApplication', entityId: 'application-1', before: 'professional-a', after: 'professional-b', metadata: expect.objectContaining({ formVersionId: 'form-version-1', fieldKey: 'architect' }), db: { tx: true } }))
    expect(spies.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ before: 'Old address', after: 'New address', metadata: expect.objectContaining({ fieldKey: 'projectAddress' }) }))
  })

  it('audits a draft form-version change even when form values are unchanged', async () => {
    spies.getFormVersionById.mockResolvedValue({ id: 'form-version-2', formId: 'form-1', version: 3, status: 'PUBLISHED', fields: [] })
    await service.updateDraft({ id: 'application-1', userId: 'user-1', formVersionId: 'form-version-2', formValues: { architect: 'professional-a', projectAddress: 'Old address' } })
    expect(spies.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1', action: 'OBO_PERMIT_APPLICATION_FORM_VERSION_CHANGED', entityType: 'OboPermitApplication', entityId: 'application-1', before: 'form-version-1', after: 'form-version-2', metadata: expect.objectContaining({ referenceNumber: 'BP-1' }), db: { tx: true } }))
  })

  it('does not create audit records for unchanged draft fields', async () => {
    await service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: { architect: 'professional-a', projectAddress: 'Old address' } })
    expect(spies.recordAudit).not.toHaveBeenCalled()
  })

  it('audits final submission with the submitted form version, values, and professional snapshots', async () => {
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', referenceNumber: 'BP-1', formVersionId: 'form-version-1', formVersion: { id: 'form-version-1', version: 2 }, permitType: { ...permitType, formId: 'form-1' }, formValues: { architect: 'professional-a' }, professionalSnapshots: null })
    spies.getFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 2, status: 'PUBLISHED', fields: [{ key: 'architect', type: 'reference', required: true, visibility: null, config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: false } }] })
    await service.submit({ id: 'application-1', userId: 'user-1' })
    expect(spies.validateProfessionalReferences).toHaveBeenCalledWith(expect.objectContaining({ formVersion: expect.objectContaining({ id: 'form-version-1' }), formValues: { architect: 'professional-a' } }))
    expect(spies.buildProfessionalSnapshots).toHaveBeenCalledWith(expect.objectContaining({ formVersion: expect.objectContaining({ id: 'form-version-1' }), formValues: { architect: 'professional-a' } }))
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1', transitionKey: 'SUBMIT_FOR_SUBMISSION', db: { tx: true } }))
    expect(spies.createTask).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', metadata: expect.objectContaining({ taskType: 'REVIEW_APPLICATION', applicationId: 'application-1' }) }), { db: { tx: true } })
    expect(spies.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'user-1', action: 'OBO_PERMIT_APPLICATION_SUBMITTED', entityType: 'OboPermitApplication', entityId: 'application-1', before: { formVersionId: 'form-version-1', formValues: { architect: 'professional-a' } }, after: expect.objectContaining({ formVersionId: 'form-version-1', formValues: { architect: 'professional-a' }, professionalSnapshots: expect.objectContaining({ architect: expect.objectContaining({ professionalId: 'professional-a', name: 'John Doe', role: 'ARCHITECT' }) }) }), metadata: expect.objectContaining({ formVersionId: 'form-version-1', referenceNumber: 'BP-1', professionalFieldKeys: ['architect'] }), db: { tx: true } }))
  })
})