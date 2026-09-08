import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/modules/obo/plan-permits/plan-permit.repository.js')
vi.mock('../../../../src/platform/forms/form.service.js')
vi.mock('../../../../src/platform/workflow/workflow.service.js')

const repository = await import('../../../../src/modules/obo/plan-permits/plan-permit.repository.js')
const formService = await import('../../../../src/platform/forms/form.service.js')
const workflowService = await import('../../../../src/platform/workflow/workflow.service.js')
const service = await import('../../../../src/modules/obo/plan-permits/plan-permit.service.js')

const spies = {
  findPersonByUserId: repository.findPersonByUserId,
  findPermitType: repository.findPermitType,
  findProfessional: repository.findProfessional,
  findFormById: repository.findFormById,
  findFormVersionById: repository.findFormVersionById,
  findWorkflowInstance: repository.findWorkflowInstance,
  findById: repository.findById,
  findOwnedByClient: repository.findOwnedByClient,
  listByClient: repository.listByClient,
  create: repository.create,
  update: repository.update,
  findPersonNotificationContext: repository.findPersonNotificationContext,
  withTransaction: repository.withTransaction,
  startWorkflow: workflowService.startWorkflow,
  transitionWorkflow: workflowService.transitionWorkflow,
  validateFormValues: formService.validateFormValues,
}

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  spies.withTransaction.mockImplementation(async (callback) => callback({}))
  spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  spies.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })
  spies.validateFormValues.mockResolvedValue({ valid: true, formVersionId: null })
  spies.findPersonNotificationContext.mockResolvedValue(null)
})

const person = { id: 'person-1', userId: 'user-1', email: 'client@example.com' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }
const professional = { id: 'professional-1', status: 'VERIFIED' }

async function arrangeClient() {
  spies.findPersonByUserId.mockResolvedValue(person)
  spies.findPermitType.mockResolvedValue(permitType)
  spies.findProfessional.mockResolvedValue(professional)
}

describe('OBO plan permit service', () => {
  it('creates a draft application and starts the platform workflow', async () => {
    await arrangeClient()
    spies.create.mockResolvedValue({ id: 'application-1', status: 'DRAFT' })
    spies.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT', workflowInstanceId: 'workflow-1' })
    expect(spies.startWorkflow).toHaveBeenCalledWith(expect.objectContaining({ workflowKey: 'obo_plan_permit', subjectType: 'OboPermitApplication', subjectId: 'application-1' }))
  })

  it('rejects missing client profile, permit type, or unverified professional', async () => {
    spies.findPersonByUserId.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} })).rejects.toThrow('person profile')
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findPermitType.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} })).rejects.toThrow('Active permit type not found')
    spies.findPermitType.mockResolvedValue(permitType)
    spies.findProfessional.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} })).rejects.toThrow('not verified')
  })

  it('gets and lists applications with workflow-derived status', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
    spies.listByClient.mockResolvedValue([{ id: 'application-1', workflowInstanceId: 'workflow-1' }])
    await expect(service.getMine({ id: 'application-1', userId: 'user-1' })).resolves.toMatchObject({ id: 'application-1', status: 'DRAFT' })
    await expect(service.listMine({ userId: 'user-1' })).resolves.toEqual([expect.objectContaining({ id: 'application-1', status: 'DRAFT' })])
  })

  it('updates only draft applications and requires a verified professional', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', professionalId: 'professional-1', formVersionId: null, permitType })
    spies.findProfessional.mockResolvedValue(professional)
    spies.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
    await expect(service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: {} })).resolves.toMatchObject({ status: 'DRAFT' })
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } })
    await expect(service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: {} })).rejects.toThrow('Only draft applications can be updated')
  })

  it('rejects updates when the application is not owned by the client', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue(null)

    await expect(service.updateDraft({
      id: 'application-other',
      userId: 'user-1',
      formValues: { projectAddress: 'Other address' },
    })).rejects.toThrow('Permit application not found')

    expect(spies.findProfessional).not.toHaveBeenCalled()
    expect(spies.update).not.toHaveBeenCalled()
  })

  it('rejects updates with an unverified professional', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      professionalId: 'professional-1',
      formVersionId: null,
      permitType,
    })
    spies.findProfessional.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })

    await expect(service.updateDraft({
      id: 'application-1',
      userId: 'user-1',
      professionalId: 'professional-1',
      formValues: {},
    })).rejects.toThrow('not verified')

    expect(spies.update).not.toHaveBeenCalled()
  })

  it('rejects invalid form values before persisting an update', async () => {
    const form = { id: 'form-1', key: 'plan-permit', isActive: true }
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      professionalId: 'professional-1',
      formVersionId: 'form-version-1',
      permitType: { ...permitType, formId: form.id },
    })
    spies.findProfessional.mockResolvedValue(professional)
    spies.findFormById.mockResolvedValue(form)
    spies.findFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 2, status: 'PUBLISHED' })
    spies.validateFormValues.mockResolvedValue({
      valid: false,
      errors: [{ field: 'projectAddress', message: 'Project Address is required.' }],
    })

    await expect(service.updateDraft({
      id: 'application-1',
      userId: 'user-1',
      formVersionId: 'form-version-1',
      formValues: {},
    })).rejects.toThrow('Permit form validation failed')

    expect(spies.update).not.toHaveBeenCalled()
  })

  it('rejects an invalid form version before persisting an update', async () => {
    const form = { id: 'form-1', key: 'plan-permit', isActive: true }
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      professionalId: 'professional-1',
      formVersionId: 'form-version-1',
      permitType: { ...permitType, formId: form.id },
    })
    spies.findProfessional.mockResolvedValue(professional)
    spies.findFormById.mockResolvedValue(form)
    spies.findFormVersionById.mockResolvedValue({ id: 'form-version-other', formId: 'form-other', version: 1, status: 'PUBLISHED' })

    await expect(service.updateDraft({
      id: 'application-1',
      userId: 'user-1',
      formVersionId: 'form-version-other',
      formValues: {},
    })).rejects.toThrow('not a published version for this permit type')

    expect(spies.validateFormValues).not.toHaveBeenCalled()
    expect(spies.update).not.toHaveBeenCalled()
  })

  it('preserves the selected form version and permit type while updating the draft', async () => {
    const form = { id: 'form-1', key: 'plan-permit', isActive: true }
    const application = {
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      professionalId: 'professional-1',
      formVersionId: 'form-version-1',
      permitTypeId: 'permit-1',
      permitType: { ...permitType, formId: form.id },
    }
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue(application)
    spies.findProfessional.mockResolvedValue(professional)
    spies.findFormById.mockResolvedValue(form)
    spies.findFormVersionById.mockResolvedValue({ id: 'form-version-1', formId: 'form-1', version: 2, status: 'PUBLISHED' })
    spies.validateFormValues.mockResolvedValue({ valid: true })
    spies.update.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })

    await expect(service.updateDraft({
      id: 'application-1',
      userId: 'user-1',
      professionalId: 'professional-1',
      formVersionId: 'form-version-1',
      formValues: { projectAddress: '123 Main Street', floorArea: 120 },
    })).resolves.toMatchObject({ status: 'DRAFT' })

    expect(spies.update).toHaveBeenCalledWith('application-1', {
      professionalId: 'professional-1',
      formVersionId: 'form-version-1',
      formValues: { projectAddress: '123 Main Street', floorArea: 120 },
    })
    expect(spies.update.mock.calls[0][1]).not.toHaveProperty('permitTypeId')
  })

  it('requires a declined application when creating a replacement', async () => {
    await arrangeClient()
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-old', referenceNumber: 'OBO-OLD' })
    spies.findWorkflowInstance.mockResolvedValueOnce({ id: 'workflow-old', currentStep: { key: 'DRAFT' } })
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {}, replacesApplicationId: 'application-1' })).rejects.toThrow('Only a declined permit application can be replaced')
  })

  it('creates a new draft linked to the declined application', async () => {
    await arrangeClient()
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-old', referenceNumber: 'OBO-OLD' })
    spies.findWorkflowInstance.mockResolvedValueOnce({ id: 'workflow-old', currentStep: { key: 'DECLINED' } }).mockResolvedValueOnce({ id: 'workflow-new', currentStep: { key: 'DRAFT' } })
    spies.create.mockResolvedValue({ id: 'application-2', status: 'DRAFT', replacesApplicationId: 'application-1' })
    spies.update.mockResolvedValue({ id: 'application-2', workflowInstanceId: 'workflow-new', replacesApplicationId: 'application-1' })
    spies.startWorkflow.mockResolvedValue({ id: 'workflow-new', currentStep: { key: 'DRAFT' } })
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: { corrected: true }, replacesApplicationId: 'application-1' })).resolves.toMatchObject({ id: 'application-2', status: 'DRAFT', replacesApplicationId: 'application-1' })
    expect(spies.create).toHaveBeenCalledWith(expect.objectContaining({ replacesApplicationId: 'application-1' }), expect.anything())
    expect(spies.startWorkflow).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ source: 'obo-plan-permit.replace-declined', replacesReferenceNumber: 'OBO-OLD' }) }))
  })

  it('submits a draft through the platform workflow transition', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      clientPersonId: 'person-1',
      referenceNumber: 'BP-1',
      permitType,
    })
    spies.findById.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
    spies.findWorkflowInstance
      .mockResolvedValueOnce({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
      .mockResolvedValueOnce({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })
    spies.transitionWorkflow.mockResolvedValueOnce({
      id: 'workflow-1',
      currentStep: { key: 'READY_FOR_SUBMISSION' },
    })

    await expect(
      service.submit({ id: 'application-1', userId: 'user-1' }),
    ).resolves.toMatchObject({ status: 'READY_FOR_SUBMISSION' })

    expect(spies.transitionWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ transitionKey: 'SUBMIT_FOR_SUBMISSION' }),
    )
  })
});
