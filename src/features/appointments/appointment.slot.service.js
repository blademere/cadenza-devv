const { getPrismaClient } = require("../../infrastructure/database/prisma")
const { BadRequestError, NotFoundError } = require("../../common/errors/appError")

const prisma = getPrismaClient()

const WEEKDAYS = Object.freeze({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 })

const parseTime = (value) => {
  const [hours, minutes] = value.split(":").map(Number)
  return (hours * 60) + minutes
}

const getWeekday = (date, timeZone) => {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date)
  return WEEKDAYS[weekday]
}

const getDateParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]))
  return { year: values.year, month: values.month, day: values.day }
}

const toDateAtMinutes = (date, minutes, timeZone) => {
  const { year, month, day } = getDateParts(date, timeZone)
  const desiredUtc = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60)
  let candidate = new Date(desiredUtc)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate)
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]))
    const actualUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute)
    candidate = new Date(candidate.getTime() + (desiredUtc - actualUtc))
  }

  return candidate
}

const generateSlots = async ({ appointmentTypeId, from, to, scheduleId, db = prisma }) => {
  if (!(from instanceof Date) || Number.isNaN(from.getTime()) || !(to instanceof Date) || Number.isNaN(to.getTime())) {
    throw new BadRequestError("from and to must be valid dates.")
  }
  if (from >= to) throw new BadRequestError("from must be earlier than to.")

  const type = await db.appointmentType.findUnique({ where: { id: appointmentTypeId } })
  if (!type) throw new NotFoundError("Appointment type not found.")

  const schedules = await db.availabilitySchedule.findMany({
    where: { appointmentTypeId, isActive: true, ...(scheduleId ? { id: scheduleId } : {}) },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
  if (scheduleId && schedules.length === 0) throw new NotFoundError("Availability schedule not found.")

  const pending = []
  for (let day = new Date(from); day < to; day.setUTCDate(day.getUTCDate() + 1)) {
    for (const schedule of schedules) {
      if (getWeekday(day, schedule.timezone) !== schedule.dayOfWeek) continue

      const start = parseTime(schedule.startTime)
      const end = parseTime(schedule.endTime)
      for (let minutes = start; minutes + schedule.slotDurationMinutes <= end; minutes += schedule.slotDurationMinutes) {
        const startsAt = toDateAtMinutes(day, minutes, schedule.timezone)
        const endsAt = toDateAtMinutes(day, minutes + schedule.slotDurationMinutes, schedule.timezone)
        if (startsAt < from || startsAt >= to) continue
        pending.push({
          appointmentTypeId,
          scheduleId: schedule.id,
          startsAt,
          endsAt,
          capacity: schedule.capacity,
          bookedCount: 0,
          status: "OPEN",
        })
      }
    }
  }

  return db.$transaction(async (tx) => {
    const created = []
    for (const data of pending) {
      const existing = await tx.appointmentSlot.findUnique({
        where: { appointmentTypeId_startsAt: { appointmentTypeId: data.appointmentTypeId, startsAt: data.startsAt } },
      })
      if (!existing) created.push(await tx.appointmentSlot.create({ data }))
    }
    return created
  })
}

module.exports = { generateSlots }
