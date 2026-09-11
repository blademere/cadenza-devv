import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/platform/audit/audit.service.js', () => ({
  recordAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}))
vi.mock('../../../src/features/appointments/appointment.repository.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    withTransaction: vi.fn(),
    findSlot: vi.fn(),
    findActiveUserAppointmentForSlot: vi.fn(),
    claimSlot: vi.fn(),
    createAppointment: vi.fn(),
    getAppointmentWithRelations: vi.fn(),
    transitionAppointment: vi.fn(),
  }
})

const {
  APPOINTMENT_ACTIONS,
  APPOINTMENT_STATUS,
  SLOT_STATUS,
} = await import('../../../src/features/appointments/appointment.constants.js')
const {
  mapAppointmentType,
  mapAppointment,
  mapAppointmentSlot,
  mapAvailabilitySchedule,
} = require('../../../src/features/appointments/appointment.mapper')
const {
  createScheduleValidator,
  generateSlotsValidator,
  createAppointmentValidator,
} = require('../../../src/features/appointments/appointment.validation')
const { generateSlots } = await import('../../../src/features/appointments/appointment.slot.service.js')
const repository = await import('../../../src/features/appointments/appointment.repository.js')
const audit = await import('../../../src/platform/audit/audit.service.js')
const { ConflictError } = await import('../../../src/common/errors/appError.js')
const { bookAppointment, checkInAppointment } = await import('../../../src/features/appointments/appointment.service.js')

describe('appointment constants', () => {
  it('exposes the complete appointment lifecycle', () => {
    expect(APPOINTMENT_STATUS).toMatchObject({
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      CHECKED_IN: 'CHECKED_IN',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      NO_SHOW: 'NO_SHOW',
    })
  })

  it('exposes management actions including no-show', () => {
    expect(APPOINTMENT_ACTIONS).toMatchObject({
      READ: 'read',
      CREATE: 'create',
      CANCEL: 'cancel',
      CHECK_IN: 'check_in',
      NO_SHOW: 'no_show',
      MANAGE: 'manage',
    })
    expect(SLOT_STATUS.OPEN).toBe('OPEN')
  })
})

describe('appointment response mappers', () => {
  it('maps appointment types without leaking persistence fields', () => {
    const createdAt = new Date('2026-08-19T00:00:00.000Z')
    const value = mapAppointmentType({
      id: 'type-1',
      key: 'SUBMISSION',
      name: 'Submission',
      description: 'Hardcopy submission',
      defaultDurationMinutes: 30,
      defaultCapacity: 5,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
      internalOnly: 'secret',
    })

    expect(value).toEqual({
      id: 'type-1',
      key: 'SUBMISSION',
      name: 'Submission',
      description: 'Hardcopy submission',
      defaultDurationMinutes: 30,
      defaultCapacity: 5,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    })
    expect(value.internalOnly).toBeUndefined()
  })

  it('maps appointments explicitly', () => {
    const createdAt = new Date('2026-08-19T00:00:00.000Z')
    const value = mapAppointment({
      id: 'appointment-1',
      referenceNumber: 'APT-1',
      appointmentTypeId: 'type-1',
      slotId: 'slot-1',
      userId: 42,
      status: 'CONFIRMED',
      metadata: { source: 'web' },
      notes: 'test',
      cancelledAt: null,
      checkedInAt: null,
      completedAt: null,
      noShowAt: null,
      createdAt,
      updatedAt: createdAt,
      secret: 'do-not-return',
    })

    expect(value.secret).toBeUndefined()
    expect(value.referenceNumber).toBe('APT-1')
    expect(value.metadata).toEqual({ source: 'web' })
  })

  it('maps nested appointment type and slot details when relations are loaded', () => {
    const createdAt = new Date('2026-08-19T00:00:00.000Z')
    const value = mapAppointment({
      id: 'appointment-1',
      referenceNumber: 'APT-1',
      appointmentTypeId: 'type-1',
      slotId: 'slot-1',
      userId: 42,
      status: 'CONFIRMED',
      metadata: null,
      notes: null,
      cancelledAt: null,
      checkedInAt: null,
      completedAt: null,
      noShowAt: null,
      createdAt,
      updatedAt: createdAt,
      appointmentType: {
        id: 'type-1',
        key: 'obo-hardcopy-submission',
        name: 'OBO Hardcopy Submission',
        description: 'Physical submission',
        defaultDurationMinutes: 30,
        defaultCapacity: 1,
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
      slot: {
        id: 'slot-1',
        appointmentTypeId: 'type-1',
        scheduleId: 'schedule-1',
        startsAt: createdAt,
        endsAt: new Date('2026-08-19T00:30:00.000Z'),
        capacity: 1,
        bookedCount: 1,
        status: 'OPEN',
        createdAt,
        updatedAt: createdAt,
      },
    })

    expect(value.appointmentType).toEqual({
      id: 'type-1',
      key: 'obo-hardcopy-submission',
      name: 'OBO Hardcopy Submission',
      description: 'Physical submission',
      defaultDurationMinutes: 30,
      defaultCapacity: 1,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    })
    expect(value.slot).toEqual({
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      scheduleId: 'schedule-1',
      startsAt: createdAt,
      endsAt: new Date('2026-08-19T00:30:00.000Z'),
      capacity: 1,
      bookedCount: 1,
      status: 'OPEN',
      createdAt,
      updatedAt: createdAt,
    })
  })

  it('maps slots and schedules explicitly', () => {
    const createdAt = new Date('2026-08-19T00:00:00.000Z')

    expect(mapAppointmentSlot({
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      scheduleId: null,
      startsAt: createdAt,
      endsAt: new Date('2026-08-19T00:30:00.000Z'),
      capacity: 5,
      bookedCount: 2,
      status: 'OPEN',
      createdAt,
      updatedAt: createdAt,
      internal: 'secret',
    })).toEqual({
      id: 'slot-1',
      appointmentTypeId: 'type-1',
      scheduleId: null,
      startsAt: createdAt,
      endsAt: new Date('2026-08-19T00:30:00.000Z'),
      capacity: 5,
      bookedCount: 2,
      status: 'OPEN',
      createdAt,
      updatedAt: createdAt,
    })

    expect(mapAvailabilitySchedule({
      id: 'schedule-1',
      appointmentTypeId: 'type-1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Manila',
      slotDurationMinutes: 30,
      capacity: 5,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    })).toEqual({
      id: 'schedule-1',
      appointmentTypeId: 'type-1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Manila',
      slotDurationMinutes: 30,
      capacity: 5,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    })
  })
})

describe('appointment validation', () => {
  it('accepts a valid availability schedule', async () => {
    const result = await createScheduleValidator({
      body: {
        appointmentTypeId: '550e8400-e29b-41d4-a716-446655440000',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'Asia/Manila',
        slotDurationMinutes: 30,
        capacity: 5,
      },
    })

    expect(result.body.dayOfWeek).toBe(1)
    expect(result.body.timezone).toBe('Asia/Manila')
  })

  it('rejects invalid slot-generation dates', async () => {
    await expect(generateSlotsValidator({
      body: {
        appointmentTypeId: '550e8400-e29b-41d4-a716-446655440000',
        from: 'not-a-date',
        to: '2026-08-20T00:00:00Z',
      },
    })).rejects.toThrow()
  })

  it('requires the appointment type and slot IDs when booking', async () => {
    await expect(createAppointmentValidator({ body: { notes: 'test' } })).rejects.toThrow()
  })
})

describe('appointment slot generation', () => {
  const prisma = {
    appointmentType: { findUnique: vi.fn() },
    availabilitySchedule: { findMany: vi.fn() },
    $transaction: vi.fn(),
  }

  it('generates slots from an Asia/Manila weekly schedule', async () => {
    prisma.appointmentType.findUnique.mockResolvedValue({ id: 'type-1' })
    prisma.availabilitySchedule.findMany.mockResolvedValue([{
      id: 'schedule-1',
      appointmentTypeId: 'type-1',
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '10:00',
      timezone: 'Asia/Manila',
      slotDurationMinutes: 30,
      capacity: 3,
      isActive: true,
    }])

    const created = []
    prisma.$transaction.mockImplementation(async (callback) => callback({
      appointmentSlot: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => {
          created.push(data)
          return { id: `slot-${created.length}`, ...data }
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    }))

    const result = await generateSlots({
      appointmentTypeId: 'type-1',
      from: new Date('2026-08-18T00:00:00.000Z'),
      to: new Date('2026-08-19T00:00:00.000Z'),
      db: prisma,
    })

    expect(result).toHaveLength(2)
    expect(created[0].scheduleId).toBe('schedule-1')
    expect(created[0].capacity).toBe(3)
    expect(created[0].startsAt.toISOString()).toBe('2026-08-18T01:00:00.000Z')
    expect(created[1].startsAt.toISOString()).toBe('2026-08-18T01:30:00.000Z')
  })

  it('rejects an invalid generation window', async () => {
    await expect(generateSlots({
      appointmentTypeId: 'type-1',
      from: new Date('2026-08-19T00:00:00.000Z'),
      to: new Date('2026-08-18T00:00:00.000Z'),
      db: prisma,
    })).rejects.toThrow('from must be earlier than to')
  })
})

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
