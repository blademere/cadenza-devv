import { z } from 'zod'

const dateTime = z.coerce.date()
const timezone = z.string().trim().min(1).max(100)

const dateRange = (fromField, toField) =>
  z
    .object({ [fromField]: dateTime, [toField]: dateTime })
    .superRefine((value, ctx) => {
      if (value[fromField] >= value[toField]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [toField],
          message: `${toField} must be after ${fromField}`,
        })
      }
    })

const timeRange = z
  .object({
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .superRefine((value, ctx) => {
    if (value.startTime >= value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be after startTime',
      })
    }
  })

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
      ...timeRange.shape,
      timezone: timezone.default('UTC'),
      slotDurationMinutes: z.coerce.number().int().min(1).max(1440),
      capacity: z.coerce.number().int().min(1).max(10000),
    })
    .superRefine((value, ctx) => {
      if (
        value.slotDurationMinutes >
        Number(value.endTime.slice(0, 2)) * 60 +
          Number(value.endTime.slice(3)) -
          (Number(value.startTime.slice(0, 2)) * 60 +
            Number(value.startTime.slice(3)))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['slotDurationMinutes'],
          message: 'slotDurationMinutes must fit within the schedule window',
        })
      }
    })
    .parse(req.body || {}),
})

const listSchedulesValidator = async (req) => ({
  query: z
    .object({
      appointmentTypeId: z.string().uuid().optional(),
      active: z.coerce.boolean().optional(),
    })
    .parse(req.query || {}),
})

const createSlotValidator = async (req) => ({
  body: dateRange('startsAt', 'endsAt')
    .and(
      z.object({
        appointmentTypeId: z.string().uuid(),
        scheduleId: z.string().uuid().optional(),
        capacity: z.coerce.number().int().min(1).max(10000),
      })
    )
    .parse(req.body || {}),
})

const generateSlotsValidator = async (req) => ({
  body: dateRange('from', 'to')
    .and(
      z.object({
        appointmentTypeId: z.string().uuid(),
        scheduleId: z.string().uuid().optional(),
      })
    )
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
    .superRefine((value, ctx) => {
      if (value.from && value.to && value.from >= value.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'to must be after from',
        })
      }
    })
    .parse(req.query || {}),
})

const listAppointmentsValidator = async (req) => ({
  query: z
    .object({
      appointmentTypeId: z.string().uuid().optional(),
      status: z.string().trim().max(30).optional(),
      from: dateTime.optional(),
      to: dateTime.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.from && value.to && value.from >= value.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'to must be after from',
        })
      }
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

export {
  listTypesValidator,
  createTypeValidator,
  createScheduleValidator,
  listSchedulesValidator,
  createSlotValidator,
  generateSlotsValidator,
  listSlotsValidator,
  listAppointmentsValidator,
  createAppointmentValidator,
  appointmentIdValidator,
}
