import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../../src/features/appointments/appointment.repository')
const { ConflictError } = require('../../../../src/common/errors/appError')

vi.spyOn(repository, 'findSlot')
vi.spyOn(repository, 'findActiveUserAppointmentForSlot')
vi.spyOn(repository, 'claimSlot')
vi.spyOn(repository, 'createAppointment')
vi.spyOn(repository, 'withTransaction')

const { bookAppointment } = await import('../../../../src/features/appointments/appointment.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation((callback) => callback({}))
  repository.findActiveUserAppointmentForSlot.mockResolvedValue(null)
})

describe('appointment booking capacity and availability', () => {
  it('books an open slot with active availability', async () => {
    const slot = {
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      startsAt: new Date(Date.now() + 60_000),
      capacity: 2,
      status: 'OPEN',
      appointmentType: { isActive: true },
      schedule: { isActive: true },
    }
    repository.findSlot.mockResolvedValue(slot)
    repository.claimSlot.mockResolvedValue({ count: 1 })
    repository.createAppointment.mockResolvedValue({ id: 'appointment-1', slotId: 'slot-1' })

    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).resolves.toEqual({
      id: 'appointment-1',
      slotId: 'slot-1',
    })

    expect(repository.claimSlot).toHaveBeenCalledWith({ slotId: 'slot-1', capacity: 2 }, expect.anything())
    expect(repository.createAppointment).toHaveBeenCalled()
  })

  it('rejects when an atomic capacity claim loses the race for the last slot', async () => {
    repository.findSlot.mockResolvedValue({
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      startsAt: new Date(Date.now() + 60_000),
      capacity: 1,
      status: 'OPEN',
      appointmentType: { isActive: true },
      schedule: { isActive: true },
    })
    repository.claimSlot.mockResolvedValue({ count: 0 })

    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow(
      'Appointment slot is full or closed.',
    )

    expect(repository.createAppointment).not.toHaveBeenCalled()
  })

  it('does not book a slot from an inactive appointment schedule', async () => {
    repository.findSlot.mockResolvedValue({
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      startsAt: new Date(Date.now() + 60_000),
      capacity: 1,
      status: 'OPEN',
      appointmentType: { isActive: true },
      schedule: { isActive: false },
    })
    repository.claimSlot.mockResolvedValue({ count: 0 })

    await expect(bookAppointment({ userId: 10, appointmentTypeId: 'type-1', slotId: 'slot-1' })).rejects.toThrow(ConflictError)
    expect(repository.createAppointment).not.toHaveBeenCalled()
  })
})
