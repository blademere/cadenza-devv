import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../src/modules/obo/plan-permits/plan-permit.repository')
const formService = require('../../../src/platform/forms/form.service')
const workflowService = require('../../../src/platform/workflow/workflow.service')
const prismaModule = require('../../../src/infrastructure/database/prisma')

const transaction = vi.fn(async (callback) => callback({}))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })

const spies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'),
  findPermitType: vi.spyOn(repository, 'findPermitType'),
  findProfessional: vi.spyOn(repository, 'findProfessional'),
  findFormById: vi.spyOn(repository, 'findFormById'),
  findFormVersionById: vi.spyOn(repository, 'findFormVersionById'),
  findWorkflowInstance: vi.spyOn(repository, 'findWorkflowInstance'),
  findById: vi.spyOn(repository, 'findById'),
  findOwnedByClient: vi.spyOn(repository, 'findOwnedByClient'),
  listByClient: vi.spyOn(repository, 'listByClient'),
  create: vi.spyOn(repository, 'create'),
  update: vi.spyOn(repository, 'update'),
  startWorkflow: vi.spyOn(workflowService, 'startWorkflow'),
  transitionWorkflow: vi.spyOn(workflowService, 'transitionWorkflow'),
}

vi.spyOn(formService, 'validateFormValues')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  spies.startWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
  spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })
})

const service = require('../../../src/modules/obo/plan-permits/plan-permit.service')

const person = { id: 'person-1' }
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

  it('submits a draft through the platform workflow transition', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', permitType })
    spies.findById.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1' })
    spies.findWorkflowInstance
      .mockResolvedValueOnce({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
      .mockResolvedValueOnce({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })
    spies.transitionWorkflow.mockResolvedValueOnce({ id: 'workflow-1', currentStep: { key: 'READY_FOR_SUBMISSION' } })

    await expect(service.submit({ id: 'application-1', userId: 'user-1' })).resolves.toMatchObject({ status: 'READY_FOR_SUBMISSION' })
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ transitionKey: 'SUBMIT_FOR_SUBMISSION' }))
  })
})
