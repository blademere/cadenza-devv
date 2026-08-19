import { afterEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../src/modules/obo/plan-permits/plan-permit.repository')
const appointmentService = require('../../../src/features/appointments/appointment.service')
const formService = require('../../../src/platform/forms/form.service')
const prismaModule = require('../../../src/infrastructure/database/prisma')

const spies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'),
  findPermitType: vi.spyOn(repository, 'findPermitType'),
  findProfessional: vi.spyOn(repository, 'findProfessional'),
  findFormById: vi.spyOn(repository, 'findFormById'),
  findFormVersionById: vi.spyOn(repository, 'findFormVersionById'),
  findOwnedByClient: vi.spyOn(repository, 'findOwnedByClient'),
  listByClient: vi.spyOn(repository, 'listByClient'),
  create: vi.spyOn(repository, 'create'),
  update: vi.spyOn(repository, 'update'),
  createSubmissionAppointment: vi.spyOn(repository, 'createSubmissionAppointment'),
}

vi.spyOn(appointmentService, 'bookAppointment')
vi.spyOn(formService, 'validateFormValues')
const transaction = vi.fn(async (callback) => callback({
  oboSubmissionAppointment: { create: vi.fn().mockResolvedValue({ id: 'submission-appointment-1' }) },
  oboPermitApplication: { update: vi.fn().mockResolvedValue({ id: 'application-1', status: 'SUBMISSION_SCHEDULED' }) },
}))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })

const service = require('../../../src/modules/obo/plan-permits/plan-permit.service')

afterEach(() => vi.clearAllMocks())

const person = { id: 'person-1' }
const permitType = { id: 'permit-1', name: 'Building Permit', isActive: true, formId: null }
const professional = { id: 'professional-1', status: 'VERIFIED' }

async function arrangeClient() {
  spies.findPersonByUserId.mockResolvedValue(person)
  spies.findPermitType.mockResolvedValue(permitType)
  spies.findProfessional.mockResolvedValue(professional)
}

describe('OBO plan permit service', () => {
  it('creates a draft application with a verified professional', async () => {
    await arrangeClient()
    spies.create.mockResolvedValue({ id: 'application-1', status: 'DRAFT' })

    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} }))
      .resolves.toMatchObject({ id: 'application-1', status: 'DRAFT' })
  })

  it('rejects missing client profile, permit type, or unverified professional', async () => {
    spies.findPersonByUserId.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} }))
      .rejects.toThrow('person profile')

    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findPermitType.mockResolvedValue(null)
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} }))
      .rejects.toThrow('Active permit type not found')

    spies.findPermitType.mockResolvedValue(permitType)
    spies.findProfessional.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
    await expect(service.createApplication({ userId: 'user-1', permitTypeId: 'permit-1', professionalId: 'professional-1', formValues: {} }))
      .rejects.toThrow('not verified')
  })

  it('gets and lists the authenticated client applications', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1' })
    spies.listByClient.mockResolvedValue([{ id: 'application-1' }])

    await expect(service.getMine({ id: 'application-1', userId: 'user-1' })).resolves.toEqual({ id: 'application-1' })
    await expect(service.listMine({ userId: 'user-1' })).resolves.toEqual([{ id: 'application-1' }])
  })

  it('updates only draft applications and requires a verified professional', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', status: 'DRAFT', professionalId: 'professional-1', formVersionId: null, permitType })
    spies.findProfessional.mockResolvedValue(professional)
    spies.update.mockResolvedValue({ id: 'application-1', status: 'DRAFT' })

    await expect(service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: {} }))
      .resolves.toMatchObject({ status: 'DRAFT' })

    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', status: 'SUBMISSION_SCHEDULED', permitType })
    await expect(service.updateDraft({ id: 'application-1', userId: 'user-1', formValues: {} }))
      .rejects.toThrow('Only draft applications can be updated')
  })

  it('submits a draft and books the hardcopy submission appointment', async () => {
    spies.findPersonByUserId.mockResolvedValue(person)
    spies.findOwnedByClient.mockResolvedValueOnce({ id: 'application-1', status: 'DRAFT', permitType })
    spies.update.mockResolvedValue({ id: 'application-1', status: 'READY_FOR_SUBMISSION' })
    await expect(service.submit({ id: 'application-1', userId: 'user-1' })).resolves.toMatchObject({ status: 'READY_FOR_SUBMISSION' })

    spies.findOwnedByClient.mockResolvedValue({ id: 'application-1', status: 'READY_FOR_SUBMISSION', submissionAppointment: null })
    appointmentService.bookAppointment.mockResolvedValue({ id: 'appointment-1' })
    spies.update.mockResolvedValue({ id: 'application-1', status: 'SUBMISSION_SCHEDULED' })
    await expect(service.bookSubmissionAppointment({ id: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1' }))
      .resolves.toMatchObject({ status: 'SUBMISSION_SCHEDULED' })
    expect(spies.createSubmissionAppointment).toHaveBeenCalledWith({ applicationId: 'application-1', appointmentId: 'appointment-1' }, expect.any(Object))
  })
})
