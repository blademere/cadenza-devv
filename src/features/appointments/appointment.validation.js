const { z } = require('zod')

const dateTime = z.coerce.date()

const listTypesValidator = async (req) => ({
  query: z
    .object({ active: z.coerce.boolean().optional() })
    .parse(req.query || {}),
})

const createTypeValidator = async (req) => ({
  body: z
    .object({
      key: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().max(1000).optional(),
      defaultDurationMinutes: z.coerce
        .number()
        .int()
        .min(1)
        .max(1440)
        .default(30),
      defaultCapacity: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .parse(req.body || {}),
})

const createScheduleValidator = async (req) => ({
  body: z
    .object({
      appointmentTypeId: z.string().uuid(),
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      timezone: z.string().trim().min(1).max(100).default('UTC'),
      slotDurationMinutes: z.coerce.number().int().min(1).max(1440),
      capacity: z.coerce.number().int().min(1).max(10000),
    })
    .parse(req.body || {}),
})

const createSlotValidator = async (req) => ({
  body: z
    .object({
      appointmentTypeId: z.string().uuid(),
      scheduleId: z.string().uuid().optional(),
      startsAt: dateTime,
      endsAt: dateTime,
      capacity: z.coerce.number().int().min(1).max(10000),
    })
    .parse(req.body || {}),
})

const generateSlotsValidator = async (req) => ({
  body: z
    .object({
      appointmentTypeId: z.string().uuid(),
      scheduleId: z.string().uuid().optional(),
      from: dateTime,
      to: dateTime,
    })
    .parse(req.body || {}),
})

const listSlotsValidator = async (req) => ({
  query: z
    .object({
      appointmentTypeId: z.string().uuid().optional(),
      from: dateTime.optional(),
      to: dateTime.optional(),
      status: z.string().trim().max(30).optional(),
    })
    .parse(req.query || {}),
})

const createAppointmentValidator = async (req) => ({
  body: z
    .object({
      appointmentTypeId: z.string().uuid(),
      slotId: z.string().uuid(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .parse(req.body || {}),
})

const appointmentIdValidator = async (req) => ({
  params: z.object({ id: z.string().uuid() }).parse(req.params || {}),
})

module.exports = {
  listTypesValidator,
  createTypeValidator,
  createScheduleValidator,
  createSlotValidator,
  generateSlotsValidator,
  listSlotsValidator,
  createAppointmentValidator,
  appointmentIdValidator,
}
