import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const transaction = vi.hoisted(() => vi.fn(async (callback) => callback({ person: { findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', email: 'client@example.com', user: { email: 'client@example.com' } }) } })))
vi.mock('../../../../../src/features/appointments/appointment.service.js')
vi.mock('../../../../../src/platform/workflow/workflow.service.js')
vi.mock('../../../../../src/infrastructure/database/prisma.js', () => ({ getPrismaClient: () => ({ $transaction: transaction }) }))
vi.mock('../../../../../src/modules/obo/plan-permits/plan-permit.service.js')
vi.mock('../../../../../src/modules/obo/plan-permits/plan-permit.repository.js')

const appointmentService = await import('../../../../../src/features/appointments/appointment.service.js')
const workflowService = await import('../../../../../src/platform/workflow/workflow.service.js')
const planPermitService = await import('../../../../../src/modules/obo/plan-permits/plan-permit.service.js')
const repository = await import('../../../../../src/modules/obo/plan-permits/plan-permit.repository.js')
const service = await import('../../../../../src/modules/obo/submission-appointments/submission-appointment.service.js')

const spies = { getMine: planPermitService.getMine, bookAppointment: appointmentService.bookAppointment, createSubmissionAppointment: repository.createSubmissionAppointment, transitionWorkflow: workflowService.transitionWorkflow }
afterEach(() => vi.clearAllMocks())
beforeEach(() => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', referenceNumber: 'BP-1', permitType: { name: 'Building Permit' }, status: 'READY_FOR_SUBMISSION', submissionAppointment: null }); spies.bookAppointment.mockResolvedValue({ id: 'appointment-1', slot: { startsAt: new Date() } }); spies.createSubmissionAppointment.mockResolvedValue({ id: 'submission-appointment-1' }); spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } }) })

describe('OBO submission appointment service', () => {
  it('books the shared appointment, creates the OBO relationship, and schedules the workflow', async () => { await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1', notes: 'Bring hardcopy plans' })).resolves.toMatchObject({ id: 'appointment-1' }); expect(spies.bookAppointment).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1', metadata: { applicationId: 'application-1', purpose: 'OBO_HARDCOPY_SUBMISSION' }, notes: 'Bring hardcopy plans', db: expect.any(Object) })); expect(spies.createSubmissionAppointment).toHaveBeenCalledWith({ applicationId: 'application-1', appointmentId: 'appointment-1' }, expect.any(Object)); expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'workflow-1', transitionKey: 'SCHEDULE_SUBMISSION', actorId: 'user-1', db: expect.any(Object) })) })
  it('rejects booking before the application is ready for submission', async () => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'DRAFT', submissionAppointment: null }); await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow('ready for submission'); expect(spies.bookAppointment).not.toHaveBeenCalled() })
  it('rejects a second submission appointment', async () => { spies.getMine.mockResolvedValue({ id: 'application-1', workflowInstanceId: 'workflow-1', status: 'READY_FOR_SUBMISSION', submissionAppointment: { id: 'submission-appointment-1' } }); await expect(service.createSubmissionAppointment({ applicationId: 'application-1', userId: 'user-1', appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow('already assigned') })
})
