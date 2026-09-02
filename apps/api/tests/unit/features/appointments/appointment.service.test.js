import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/features/appointments/appointment.repository.js')
vi.mock('../../../../src/platform/audit/audit.service.js')

const repository = await import('../../../../src/features/appointments/appointment.repository.js')
const audit = await import('../../../../src/platform/audit/audit.service.js')
const { ConflictError } = await import('../../../../src/common/errors/appError.js')
const { bookAppointment } = await import('../../../../src/features/appointments/appointment.service.js')

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
