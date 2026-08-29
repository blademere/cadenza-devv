import { describe, expect, it } from 'vitest'

const {
  createScheduleValidator,
  generateSlotsValidator,
  createAppointmentValidator,
} = require('../../../src/features/appointments/appointment.validation')

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
