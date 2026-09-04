import { describe, expect, it } from 'vitest'
const {
  mapAppointmentType,
  mapAppointment,
  mapAppointmentSlot,
  mapAvailabilitySchedule,
} = require('../../../src/features/appointments/appointment.mapper')

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
