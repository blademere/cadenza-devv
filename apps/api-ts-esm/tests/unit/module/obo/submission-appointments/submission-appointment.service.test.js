import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const appointmentService = require('../../../../../src/features/appointments/appointment.service')
const workflowService = require('../../../../../src/platform/workflow/workflow.service')
const prismaModule = require('../../../../../src/infrastructure/database/prisma')
const planPermitService = require('../../../../../src/modules/obo/plan-permits/plan-permit.service')
const repository = require('../../../../../src/modules/obo/plan-permits/plan-permit.repository')

const transaction = vi.fn(async (callback) => callback({ person: { findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'client@example.com', user: { email: 'client@example.com' } }) } }))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })
const spies = { getMine: vi.spyOn(planPermitService, 'getMine'), bookAppointment: vi.spyOn(appointmentService, 'bookAppointment'), createSubmissionAppointment: vi.spyOn(repository, 'createSubmissionAppointment'), transitionWorkflow: vi.spyOn(workflowService, 'transitionWorkflow') }
afterEach(() => vi.clearAllMocks())
beforeEach(() => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', referenceNumber: 'BP-1', permitType: { name: 'Building Permit' }, status: 'READY_FOR_SUBMISSION', submissionAppointment: null }); spies.bookAppointment.mockResolvedValue({ id: 'appointment-1', slot: { startsAt: new Date() } }); spies.createSubmissionAppointment.mockResolvedValue({ id: 'submission-appointment-1' }); spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } }) })
const service = require('../../../../../src/modules/obo/submission-appointments/submission-appointment.service')

describe('OBO submission appointment service', () => {
  it('books the shared appointment, creates the OBO relationship, and schedules the workflow', async () => { await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1', notes: 'Bring hardcopy plans' })).resolves.toMatchObject({ id: 'appointment-1' }); expect(spies.bookAppointment).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1', metadata: { applicationId: 'application-1', purpose: 'OBO_HARDCOPY_SUBMISSION' }, notes: 'Bring hardcopy plans', db: expect.any(Object) })); expect(spies.createSubmissionAppointment).toHaveBeenCalledWith({ applicationId: 'application-1', appointmentId: 'appointment-1' }, expect.any(Object)); expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'workflow-1', transitionKey: 'SCHEDULE_SUBMISSION', actorId: 'user-1', db: expect.any(Object) })) })
  it('rejects booking before the application is ready for submission', async () => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', submissionAppointment: null }); await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow('ready for submission'); expect(spies.bookAppointment).not.toHaveBeenCalled() })
  it('rejects a second submission appointment', async () => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'READY_FOR_SUBMISSION', submissionAppointment: { id: 'submission-appointment-1' } }); await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow('already assigned') })
})
