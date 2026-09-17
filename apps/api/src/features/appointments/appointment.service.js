import crypto from 'node:crypto'
import { ConflictError, NotFoundError, BadRequestError } from '../../common/errors/appError.js'
import { APPOINTMENT_STATUS } from './appointment.constants.js'
import * as repository from './appointment.repository.js'
import { recordAudit } from '../../platform/audit/audit.service.js'

const WEEKDAYS = Object.freeze({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 })
const parseTime = (value) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
const getWeekday = (date, timeZone) => WEEKDAYS[new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)]
const getDateParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  return { year: values.year, month: values.month, day: values.day }
}
const toDateAtMinutes = (date, minutes, timeZone) => {
  const { year, month, day } = getDateParts(date, timeZone)
  const desiredUtc = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60)
  let candidate = new Date(desiredUtc)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(candidate)
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
    candidate = new Date(candidate.getTime() - Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute) + desiredUtc)
  }
  return candidate
}

const createReferenceNumber = () => `APT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
const requireAppId = (appId) => {
  if (!appId) throw new BadRequestError('Application context is required.')
  return appId
}
const listAppointmentTypes = ({ appId, active }) => repository.listAppointmentTypes({ appId: requireAppId(appId), active })
const listAvailabilitySchedules = ({ appId, appointmentTypeId, active }) => repository.listAvailabilitySchedules({ appId: requireAppId(appId), appointmentTypeId, active })
const listAppointmentSlots = ({ appId, appointmentTypeId, from, to, status }) => repository.listAppointmentSlots({ appId: requireAppId(appId), appointmentTypeId, from, to, status })
const listAppointments = ({ appId, appointmentTypeId, status, from, to }) => repository.listAppointments({ appId: requireAppId(appId), appointmentTypeId, status, from, to })
const getAppointmentForReference = async ({ id, appId, db }) => {
  const appointment = await repository.getAppointmentWithRelations(id, requireAppId(appId), db)
  if (!appointment) throw new NotFoundError('Appointment not found.')
  return appointment
}
const listAppointmentsForReferences = ({ ids, appId, db }) => repository.findAppointmentsByIds(ids, requireAppId(appId), db)

const createAppointmentType = async ({ actorId, appId, data }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const created = await repository.createAppointmentType({ ...data, appId: owner }, tx)
    await recordAudit({ actorId, appId: owner, action: 'APPOINTMENT_TYPE_CREATED', entityType: 'AppointmentType', entityId: created.id, before: null, after: created, db: tx })
    return created
  })
}

const createAvailabilitySchedule = async ({ actorId, appId, data }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const type = await repository.findAppointmentType(data.appointmentTypeId, owner, tx)
    if (!type) throw new NotFoundError('Appointment type not found.')
    if (data.startTime >= data.endTime) throw new BadRequestError('Schedule startTime must be earlier than endTime.')
    if (data.slotDurationMinutes <= 0 || data.capacity <= 0) throw new BadRequestError('Schedule duration and capacity must be positive.')
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) throw new BadRequestError('Schedule dayOfWeek must be between 0 and 6.')
    const created = await repository.createAvailabilitySchedule(data, tx)
    await recordAudit({ actorId, appId: owner, action: 'APPOINTMENT_SCHEDULE_CREATED', entityType: 'AvailabilitySchedule', entityId: created.id, before: null, after: created, db: tx })
    return created
  })
}

const createAppointmentSlot = async ({ actorId, appId, data }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const type = await repository.findAppointmentType(data.appointmentTypeId, owner, tx)
    if (!type) throw new NotFoundError('Appointment type not found.')
    if (data.endsAt <= data.startsAt) throw new BadRequestError('Slot endsAt must be later than startsAt.')
    if (data.capacity <= 0) throw new BadRequestError('Slot capacity must be positive.')
    if (data.scheduleId && !(await repository.findSchedule({ id: data.scheduleId, appointmentTypeId: data.appointmentTypeId, appId: owner }, tx))) throw new BadRequestError('Schedule does not belong to the appointment type.')
    const created = await repository.createAppointmentSlot(data, tx)
    await recordAudit({ actorId, appId: owner, action: 'APPOINTMENT_SLOT_CREATED', entityType: 'AppointmentSlot', entityId: created.id, before: null, after: created, db: tx })
    return created
  })
}

const generateSlots = async ({ appointmentTypeId, from, to, scheduleId, actorId, appId, db }) => {
  const owner = requireAppId(appId)
  if (!(from instanceof Date) || Number.isNaN(from.getTime()) || !(to instanceof Date) || Number.isNaN(to.getTime())) throw new BadRequestError('from and to must be valid dates.')
  if (from >= to) throw new BadRequestError('from must be earlier than to.')

  const execute = async (tx) => {
    if (!(await repository.findAppointmentType(appointmentTypeId, owner, tx))) throw new NotFoundError('Appointment type not found.')
    const schedules = await repository.listActiveSchedules({ appointmentTypeId, scheduleId, appId: owner }, tx)
    if (scheduleId && schedules.length === 0) throw new NotFoundError('Availability schedule not found.')

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
          pending.push({ appointmentTypeId, scheduleId: schedule.id, startsAt, endsAt, capacity: schedule.capacity, bookedCount: 0, status: 'OPEN' })
        }
      }
    }

    const created = []
    for (const data of pending) {
      if (await repository.findSlotByStart({ appointmentTypeId: data.appointmentTypeId, startsAt: data.startsAt, appId: owner }, tx)) continue
      try {
        const slot = await repository.createAppointmentSlot(data, tx)
        created.push(slot)
        await recordAudit({ actorId, appId: owner, action: 'APPOINTMENT_SLOT_CREATED', entityType: 'AppointmentSlot', entityId: slot.id, before: null, after: slot, db: tx })
      } catch (error) {
        if (error.code !== 'P2002') throw error
      }
    }
    return created
  }

  return db ? execute(db) : repository.withTransaction(execute)
}

const bookAppointment = async ({ userId, appId, appointmentTypeId, slotId, metadata, notes, db }) => {
  const owner = requireAppId(appId)
  const execute = async (tx) => {
    const slot = await repository.findSlot(slotId, owner, tx)
    if (!slot) throw new NotFoundError('Appointment slot not found.')
    if (slot.appointmentTypeId !== appointmentTypeId) throw new BadRequestError('Slot does not belong to the appointment type.')
    if (slot.startsAt <= new Date()) throw new ConflictError('Appointment slot is no longer bookable.')
    const existing = await repository.findActiveUserAppointmentForSlot({ slotId, userId, appId: owner, statuses: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN] }, tx)
    if (existing) throw new ConflictError('You already have an active appointment for this slot.')
    const claimed = await repository.claimSlot({ slotId, capacity: slot.capacity, appId: owner }, tx)
    if (claimed.count !== 1) throw new ConflictError('Appointment slot is full or closed.')
    const created = await repository.createAppointment({ referenceNumber: createReferenceNumber(), appId: owner, appointmentTypeId, slotId, userId, status: APPOINTMENT_STATUS.CONFIRMED, metadata, notes }, tx)
    await recordAudit({ actorId: userId, appId: owner, action: 'APPOINTMENT_CREATED', entityType: 'Appointment', entityId: created.id, before: null, after: created, db: tx })
    return created
  }
  return db ? execute(db) : repository.withTransaction(execute)
}

const getMyAppointment = async ({ id, userId, appId }) => {
  const appointment = await repository.findUserAppointment({ id, userId, appId: requireAppId(appId) })
  if (!appointment) throw new NotFoundError('Appointment not found.')
  return appointment
}
const listMyAppointments = ({ userId, appId }) => repository.listUserAppointments(userId, requireAppId(appId))

const cancelAppointment = async ({ id, userId, appId, db }) => {
  const owner = requireAppId(appId)
  const execute = async (tx) => {
    const appointment = await repository.findUserAppointment({ id, userId, appId: owner }, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError('Only pending or confirmed appointments can be cancelled.')
    const result = await repository.cancelAppointmentRecord(id, owner, tx)
    if (result.count !== 1) throw new NotFoundError('Appointment not found.')
    const updated = await repository.getAppointmentWithRelations(id, owner, tx)
    await repository.releaseSlot(appointment.slotId, owner, tx)
    await recordAudit({ actorId: userId, appId: owner, action: 'APPOINTMENT_CANCELLED', entityType: 'Appointment', entityId: id, before: appointment, after: updated, db: tx })
    return updated
  }
  return db ? execute(db) : repository.withTransaction(execute)
}

const cancelManagedAppointment = async ({ id, actorId, appId }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const appointment = await repository.findAppointment(id, owner, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError('Only pending or confirmed appointments can be cancelled.')
    const result = await repository.cancelAppointmentRecord(id, owner, tx)
    if (result.count !== 1) throw new NotFoundError('Appointment not found.')
    const updated = await repository.getAppointmentWithRelations(id, owner, tx)
    await repository.releaseSlot(appointment.slotId, owner, tx)
    await recordAudit({ actorId, appId: owner, action: 'APPOINTMENT_CANCELLED', entityType: 'Appointment', entityId: id, before: appointment, after: updated, db: tx })
    return updated
  })
}

const updateAppointmentStatus = async ({ id, actorId, appId, fromStatus, status, timestampField }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const before = await repository.findAppointment(id, owner, tx)
    if (!before) throw new NotFoundError('Appointment not found.')
    const updated = await repository.transitionAppointment({ id, appId: owner, fromStatus, status, timestampField }, tx)
    if (updated.count !== 1) throw new ConflictError(`Only ${fromStatus.toLowerCase().replaceAll('_', ' ')} appointments can be changed to ${status.toLowerCase().replaceAll('_', ' ')}.`)
    const after = await repository.getAppointmentWithRelations(id, owner, tx)
    await recordAudit({ actorId, appId: owner, action: `APPOINTMENT_${status}`, entityType: 'Appointment', entityId: id, before, after, db: tx })
    return after
  })
}

const checkInAppointment = async ({ id, actorId, appId }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    const appointment = await repository.getAppointmentWithRelations(id, owner, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) throw new ConflictError('Only confirmed appointments can be checked in.')
    const now = new Date()
    if (now < appointment.slot.startsAt) throw new ConflictError('The appointment check-in window has not started yet.')
    if (now > appointment.slot.endsAt) throw new ConflictError('The appointment check-in window has already ended.')
    const updated = await repository.transitionAppointment({ id, appId: owner, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.CHECKED_IN, timestampField: 'checkedInAt' }, tx)
    if (updated.count !== 1) throw new ConflictError('Only confirmed appointments can be checked in.')
    const after = await repository.getAppointmentWithRelations(id, owner, tx)
    await recordAudit({ actorId, appId: owner, action: `APPOINTMENT_${APPOINTMENT_STATUS.CHECKED_IN}`, entityType: 'Appointment', entityId: id, before: appointment, after, db: tx })
    return after
  })
}

const completeAppointment = ({ id, actorId, appId }) => updateAppointmentStatus({ id, actorId, appId, fromStatus: APPOINTMENT_STATUS.CHECKED_IN, status: APPOINTMENT_STATUS.COMPLETED, timestampField: 'completedAt' })
const markNoShow = ({ id, actorId, appId }) => updateAppointmentStatus({ id, actorId, appId, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.NO_SHOW, timestampField: 'noShowAt' })

export { listAppointmentTypes, listAvailabilitySchedules, listAppointmentSlots, listAppointments, createAppointmentType, createAvailabilitySchedule, createAppointmentSlot, generateSlots, bookAppointment, getMyAppointment, listMyAppointments, getAppointmentForReference, listAppointmentsForReferences, cancelAppointment, cancelManagedAppointment, checkInAppointment, completeAppointment, markNoShow }
