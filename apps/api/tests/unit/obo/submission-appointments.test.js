import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/appointments/appointment.service.js')
vi.mock('../../../src/platform/workflow/workflow.service.js')
vi.mock('../../../src/platform/event-bus/event-bus.js')
vi.mock('../../../src/features/tasks/tasks.service.js')
vi.mock('../../../src/apps/obo/plan-permits/plan-permit.service.js')
vi.mock(
  '../../../src/apps/obo/submission-appointments/submission-appointment.repository.js'
)

const appointmentService =
  await import('../../../src/features/appointments/appointment.service.js')
const workflowService =
  await import('../../../src/platform/workflow/workflow.service.js')
const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const taskService = await import('../../../src/features/tasks/tasks.service.js')
const planPermitService =
  await import('../../../src/apps/obo/plan-permits/plan-permit.service.js')
const repository =
  await import('../../../src/apps/obo/submission-appointments/submission-appointment.repository.js')
const service =
  await import('../../../src/apps/obo/submission-appointments/submission-appointment.service.js')

const spies = {
  getMine: planPermitService.getMine,
  bookAppointment: appointmentService.bookAppointment,
  cancelAppointment: appointmentService.cancelAppointment,
  createSubmissionAppointment: repository.createSubmissionAppointment,
  updateSubmissionAppointment: repository.updateSubmissionAppointment,
  transitionWorkflow: workflowService.transitionWorkflow,
  createTask: taskService.create,
  listTasks: taskService.list,
  withTransaction: repository.withTransaction,
  findPersonNotificationContext: repository.findPersonNotificationContext,
  publish: eventBus.publish,
}

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  spies.withTransaction.mockImplementation(async (callback) => callback({}))
  spies.getMine.mockResolvedValue({
    id: 'application-1',
    caseId: 'case-1',
    workflowInstanceId: 'workflow-1',
    clientPersonId: 'person-1',
    referenceNumber: 'BP-1',
    permitType: { name: 'Building Permit' },
    permitTypeId: 'permit-1',
    status: 'READY_FOR_SUBMISSION',
    submissionAppointment: null,
  })
  spies.bookAppointment.mockResolvedValue({
    id: 'appointment-1',
    slot: { startsAt: new Date(), endsAt: new Date(Date.now() + 3600000) },
  })
  spies.cancelAppointment.mockResolvedValue({ id: 'appointment-old' })
  spies.createSubmissionAppointment.mockResolvedValue({
    id: 'submission-appointment-1',
  })
  spies.updateSubmissionAppointment.mockResolvedValue({
    id: 'submission-appointment-1',
  })
  spies.findPersonNotificationContext.mockResolvedValue({
    userId: 'user-1',
    email: 'client@example.com',
    user: { email: 'client@example.com' },
  })
  spies.transitionWorkflow.mockResolvedValue({
    id: 'workflow-1',
    currentStep: { key: 'SUBMISSION_SCHEDULED' },
  })
  spies.createTask.mockResolvedValue({ id: 'task-1' })
  spies.listTasks.mockResolvedValue([])
  spies.publish.mockResolvedValue(undefined)
})

describe('OBO submission appointment service', () => {
  it('books the shared appointment, creates the OBO relationship, schedules the workflow, creates a receiving task, and emits an event', async () => {
    await expect(
      service.createSubmissionAppointment({
        applicationId: 'application-1',
        userId: 'user-1',
        appointmentTypeId: 'type-1',
        slotId: 'slot-1',
        notes: 'Bring hardcopy plans',
      })
    ).resolves.toMatchObject({ id: 'appointment-1' })
    expect(spies.bookAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        appointmentTypeId: 'type-1',
        slotId: 'slot-1',
        metadata: {
          applicationId: 'application-1',
          purpose: 'OBO_HARDCOPY_SUBMISSION',
        },
        notes: 'Bring hardcopy plans',
        db: expect.any(Object),
      })
    )
    expect(spies.createSubmissionAppointment).toHaveBeenCalledWith(
      { applicationId: 'application-1', appointmentId: 'appointment-1' },
      expect.any(Object)
    )
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceId: 'workflow-1',
        transitionKey: 'SCHEDULE_SUBMISSION',
        actorId: 'user-1',
        db: expect.any(Object),
      })
    )
    expect(spies.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case-1',
        title: 'Receive hard-copy documents',
        metadata: expect.objectContaining({
          taskType: 'RECEIVE_HARD_COPY',
          applicationId: 'application-1',
          appointmentId: 'appointment-1',
        }),
      }),
      { db: expect.any(Object) }
    )
    expect(spies.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'obo.permit_application.appointment.booked',
        entityId: 'application-1',
        db: expect.any(Object),
      })
    )
  })
  it('rejects booking before the application is ready for submission', async () => {
    spies.getMine.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      status: 'DRAFT',
      submissionAppointment: null,
    })
    await expect(
      service.createSubmissionAppointment({
        applicationId: 'application-1',
        userId: 'user-1',
        appointmentTypeId: 'type-1',
        slotId: 'slot-1',
      })
    ).rejects.toThrow('ready for submission')
    expect(spies.bookAppointment).not.toHaveBeenCalled()
  })
  it('rejects a second submission appointment', async () => {
    spies.getMine.mockResolvedValue({
      id: 'application-1',
      workflowInstanceId: 'workflow-1',
      status: 'READY_FOR_SUBMISSION',
      submissionAppointment: { id: 'submission-appointment-1' },
    })
    await expect(
      service.createSubmissionAppointment({
        applicationId: 'application-1',
        userId: 'user-1',
        appointmentTypeId: 'type-1',
        slotId: 'slot-1',
      })
    ).rejects.toThrow('already assigned')
  })
  it('reschedules the shared appointment and emits a reschedule event', async () => {
    spies.getMine.mockResolvedValue({
      id: 'application-1',
      caseId: 'case-1',
      workflowInstanceId: 'workflow-1',
      referenceNumber: 'BP-1',
      permitTypeId: 'permit-1',
      permitType: { name: 'Building Permit' },
      status: 'SUBMISSION_SCHEDULED',
      submissionAppointment: { appointmentId: 'appointment-old' },
    })
    spies.bookAppointment.mockResolvedValue({
      id: 'appointment-new',
      slot: { startsAt: new Date(), endsAt: new Date(Date.now() + 3600000) },
    })
    spies.listTasks.mockResolvedValue([
      {
        id: 'task-1',
        status: 'OPEN',
        metadata: {
          applicationId: 'application-1',
          taskType: 'RECEIVE_HARD_COPY',
          appointmentId: 'appointment-old',
        },
      },
    ])
    await expect(
      service.replaceSubmissionAppointment({
        applicationId: 'application-1',
        userId: 'user-1',
        appointmentTypeId: 'type-1',
        slotId: 'slot-2',
      })
    ).resolves.toMatchObject({ id: 'appointment-new' })
    expect(spies.cancelAppointment).toHaveBeenCalledWith({
      id: 'appointment-old',
      userId: 'user-1',
      db: expect.any(Object),
    })
    expect(spies.updateSubmissionAppointment).toHaveBeenCalledWith(
      'application-1',
      'appointment-new',
      expect.any(Object)
    )
    expect(spies.createTask).not.toHaveBeenCalled()
    expect(spies.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'obo.permit_application.appointment.rescheduled',
        entityId: 'application-1',
        db: expect.any(Object),
      })
    )
  })
})
