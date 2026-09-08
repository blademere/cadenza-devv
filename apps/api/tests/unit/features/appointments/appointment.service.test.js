import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/features/appointments/appointment.repository.js')
vi.mock('../../../../src/platform/audit/audit.service.js')

const repository = await import('../../../../src/features/appointments/appointment.repository.js')
const audit = await import('../../../../src/platform/audit/audit.service.js')
const { ConflictError } = await import('../../../../src/common/errors/appError.js')
const { bookAppointment, checkInAppointment } = await import('../../../../src/features/appointments/appointment.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation((callback) => callback({}))
  repository.findActiveUserAppointmentForSlot.mockResolvedValue(null)
  audit.recordAudit.mockResolvedValue({ id: 'audit-1' })
})

describe('appointment booking capacity and availability', () => {
  it('books an open slot with active availability', async () => {
    const slot = { id: 'slot-1', appointmentTypeId: 'type-1', startsAt: new Date(Date.now() + 60000), capacity: 2, status: 'OPEN', appointmentType: { isActive: true }, schedule: { isActive: true } }
    repository.findSlot.mockResolvedValue(slot)
    repository.claimSlot.mockResolvedValue({ count: 1 })
    repository.createAppointment.mockResolvedValue({ id: 'appointment-1', slotId: 'slot-1' })
    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).resolves.toEqual({ id: 'appointment-1', slotId: 'slot-1' })
    expect(repository.claimSlot).toHaveBeenCalledWith({ slotId: 'slot-1', capacity: 2 }, expect.anything())
    expect(repository.createAppointment).toHaveBeenCalled()
    expect(audit.recordAudit).toHaveBeenCalled()
  })
  it('rejects when an atomic capacity claim loses the race for the last slot', async () => {
    repository.findSlot.mockResolvedValue({ id: 'slot-1', appointmentTypeId: 'type-1', startsAt: new Date(Date.now() + 60000), capacity: 1, status: 'OPEN', appointmentType: { isActive: true }, schedule: { isActive: true } })
    repository.claimSlot.mockResolvedValue({ count: 0 })
    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow('Appointment slot is full or closed.')
    expect(repository.createAppointment).not.toHaveBeenCalled()
  })
  it('does not book a slot from an inactive appointment schedule', async () => {
    repository.findSlot.mockResolvedValue({ id: 'slot-1', appointmentTypeId: 'type-1', startsAt: new Date(Date.now() + 60000), capacity: 1, status: 'OPEN', appointmentType: { isActive: true }, schedule: { isActive: false } })
    repository.claimSlot.mockResolvedValue({ count: 0 })
    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow(ConflictError)
    expect(repository.createAppointment).not.toHaveBeenCalled()
  })
})

describe('appointment check-in window', () => {
  const makeAppointment = (startsAt, endsAt, status = 'CONFIRMED') => ({
    id: 'appointment-1',
    status,
    slot: { id: 'slot-1', startsAt, endsAt },
  })

  it('rejects check-in before the slot starts', async () => {
    const startsAt = new Date(Date.now() + 60000)
    repository.getAppointmentWithRelations.mockResolvedValue(makeAppointment(startsAt, new Date(startsAt.getTime() + 1800000)))

    await expect(checkInAppointment({ id: 'appointment-1', actorId: 10 })).rejects.toThrow('The appointment check-in window has not started yet.')
    expect(repository.transitionAppointment).not.toHaveBeenCalled()
  })

  it('rejects check-in after the slot ends', async () => {
    const endsAt = new Date(Date.now() - 60000)
    repository.getAppointmentWithRelations.mockResolvedValue(makeAppointment(new Date(endsAt.getTime() - 1800000), endsAt))

    await expect(checkInAppointment({ id: 'appointment-1', actorId: 10 })).rejects.toThrow('The appointment check-in window has already ended.')
    expect(repository.transitionAppointment).not.toHaveBeenCalled()
  })

  it('allows check-in during the slot window', async () => {
    const startsAt = new Date(Date.now() - 60000)
    const endsAt = new Date(Date.now() + 60000)
    repository.getAppointmentWithRelations
      .mockResolvedValueOnce(makeAppointment(startsAt, endsAt))
      .mockResolvedValueOnce({ id: 'appointment-1', status: 'CHECKED_IN', slot: { id: 'slot-1', startsAt, endsAt } })
    repository.transitionAppointment.mockResolvedValue({ count: 1 })

    await expect(checkInAppointment({ id: 'appointment-1', actorId: 10 })).resolves.toMatchObject({ id: 'appointment-1', status: 'CHECKED_IN' })
    expect(repository.transitionAppointment).toHaveBeenCalledWith({ id: 'appointment-1', fromStatus: 'CONFIRMED', status: 'CHECKED_IN', timestampField: 'checkedInAt' }, expect.anything())
    expect(audit.recordAudit).toHaveBeenCalled()
  })
})
