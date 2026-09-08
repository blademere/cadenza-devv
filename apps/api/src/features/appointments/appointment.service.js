import crypto from 'node:crypto'
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../common/errors/appError.js'
import { APPOINTMENT_STATUS } from './appointment.constants.js'
import * as repository from './appointment.repository.js'
import { recordAudit } from '../../platform/audit/audit.service.js'

const createReferenceNumber = () =>
  `APT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
const listAppointmentTypes = ({ active }) => repository.listAppointmentTypes({ active })
const listAvailabilitySchedules = ({ appointmentTypeId, active }) => repository.listAvailabilitySchedules({ appointmentTypeId, active })
const listAppointmentSlots = ({ appointmentTypeId, from, to, status }) => repository.listAppointmentSlots({ appointmentTypeId, from, to, status })
const listAppointments = ({ appointmentTypeId, status, from, to }) => repository.listAppointments({ appointmentTypeId, status, from, to })

const createAppointmentType = async ({ actorId, data }) =>
  repository.withTransaction(async (tx) => {
    const created = await repository.createAppointmentType(data, tx)
    await recordAudit({ actorId, action: 'APPOINTMENT_TYPE_CREATED', entityType: 'AppointmentType', entityId: created.id, before: null, after: created, db: tx })
    return created
  })

const createAvailabilitySchedule = async ({ actorId, data }) =>
  repository.withTransaction(async (tx) => {
    const type = await repository.findAppointmentType(data.appointmentTypeId, tx)
    if (!type) throw new NotFoundError('Appointment type not found.')
    if (data.startTime >= data.endTime) throw new BadRequestError('Schedule startTime must be earlier than endTime.')
    if (data.slotDurationMinutes <= 0 || data.capacity <= 0) throw new BadRequestError('Schedule duration and capacity must be positive.')
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) throw new BadRequestError('Schedule dayOfWeek must be between 0 and 6.')
    const created = await repository.createAvailabilitySchedule(data, tx)
    await recordAudit({ actorId, action: 'APPOINTMENT_SCHEDULE_CREATED', entityType: 'AvailabilitySchedule', entityId: created.id, before: null, after: created, db: tx })
    return created
  })

const createAppointmentSlot = async ({ actorId, data }) =>
  repository.withTransaction(async (tx) => {
    const type = await repository.findAppointmentType(data.appointmentTypeId, tx)
    if (!type) throw new NotFoundError('Appointment type not found.')
    if (data.endsAt <= data.startsAt) throw new BadRequestError('Slot endsAt must be later than startsAt.')
    if (data.capacity <= 0) throw new BadRequestError('Slot capacity must be positive.')
    if (data.scheduleId && !(await repository.findSchedule({ id: data.scheduleId, appointmentTypeId: data.appointmentTypeId }, tx))) throw new BadRequestError('Schedule does not belong to the appointment type.')
    const created = await repository.createAppointmentSlot(data, tx)
    await recordAudit({ actorId, action: 'APPOINTMENT_SLOT_CREATED', entityType: 'AppointmentSlot', entityId: created.id, before: null, after: created, db: tx })
    return created
  })

const bookAppointment = async ({ userId, appointmentTypeId, slotId, metadata, notes, db }) => {
  const execute = async (tx) => {
    const slot = await repository.findSlot(slotId, tx)
    if (!slot) throw new NotFoundError('Appointment slot not found.')
    if (slot.appointmentTypeId !== appointmentTypeId) throw new BadRequestError('Slot does not belong to the appointment type.')
    if (slot.startsAt <= new Date()) throw new ConflictError('Appointment slot is no longer bookable.')
    const existing = await repository.findActiveUserAppointmentForSlot({ slotId, userId, statuses: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN] }, tx)
    if (existing) throw new ConflictError('You already have an active appointment for this slot.')
    const claimed = await repository.claimSlot({ slotId, capacity: slot.capacity }, tx)
    if (claimed.count !== 1) throw new ConflictError('Appointment slot is full or closed.')
    const created = await repository.createAppointment({ referenceNumber: createReferenceNumber(), appointmentTypeId, slotId, userId, status: APPOINTMENT_STATUS.CONFIRMED, metadata, notes }, tx)
    await recordAudit({ actorId: userId, action: 'APPOINTMENT_CREATED', entityType: 'Appointment', entityId: created.id, before: null, after: created, db: tx })
    return created
  }
  return db ? execute(db) : repository.withTransaction(execute)
}

const getMyAppointment = async ({ id, userId }) => {
  const appointment = await repository.findUserAppointment({ id, userId })
  if (!appointment) throw new NotFoundError('Appointment not found.')
  return appointment
}
const listMyAppointments = ({ userId }) => repository.listUserAppointments(userId)

const cancelAppointment = async ({ id, userId, db }) => {
  const execute = async (tx) => {
    const appointment = await repository.findUserAppointment({ id, userId }, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError('Only pending or confirmed appointments can be cancelled.')
    const updated = await repository.cancelAppointmentRecord(id, tx)
    await repository.releaseSlot(appointment.slotId, tx)
    await recordAudit({ actorId: userId, action: 'APPOINTMENT_CANCELLED', entityType: 'Appointment', entityId: id, before: appointment, after: updated, db: tx })
    return updated
  }
  return db ? execute(db) : repository.withTransaction(execute)
}

const cancelManagedAppointment = async ({ id, actorId }) => {
  return repository.withTransaction(async (tx) => {
    const appointment = await repository.findAppointment(id, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError('Only pending or confirmed appointments can be cancelled.')
    const updated = await repository.cancelAppointmentRecord(id, tx)
    await repository.releaseSlot(appointment.slotId, tx)
    await recordAudit({ actorId, action: 'APPOINTMENT_CANCELLED', entityType: 'Appointment', entityId: id, before: appointment, after: updated, db: tx })
    return updated
  })
}

const updateAppointmentStatus = async ({ id, actorId, fromStatus, status, timestampField }) =>
  repository.withTransaction(async (tx) => {
    const before = await repository.findAppointment(id, tx)
    if (!before) throw new NotFoundError('Appointment not found.')
    const updated = await repository.transitionAppointment({ id, fromStatus, status, timestampField }, tx)
    if (updated.count !== 1) throw new ConflictError(`Only ${fromStatus.toLowerCase().replaceAll('_', ' ')} appointments can be changed to ${status.toLowerCase().replaceAll('_', ' ')}.`)
    const after = await repository.getAppointmentWithRelations(id, tx)
    await recordAudit({ actorId, action: `APPOINTMENT_${status}`, entityType: 'Appointment', entityId: id, before, after, db: tx })
    return after
  })

const checkInAppointment = async ({ id, actorId }) =>
  repository.withTransaction(async (tx) => {
    const appointment = await repository.getAppointmentWithRelations(id, tx)
    if (!appointment) throw new NotFoundError('Appointment not found.')
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      throw new ConflictError('Only confirmed appointments can be checked in.')
    }

    const now = new Date()
    if (now < appointment.slot.startsAt) {
      throw new ConflictError('The appointment check-in window has not started yet.')
    }
    if (now > appointment.slot.endsAt) {
      throw new ConflictError('The appointment check-in window has already ended.')
    }

    const updated = await repository.transitionAppointment({
      id,
      fromStatus: APPOINTMENT_STATUS.CONFIRMED,
      status: APPOINTMENT_STATUS.CHECKED_IN,
      timestampField: 'checkedInAt',
    }, tx)
    if (updated.count !== 1) throw new ConflictError('Only confirmed appointments can be checked in.')

    const after = await repository.getAppointmentWithRelations(id, tx)
    await recordAudit({ actorId, action: `APPOINTMENT_${APPOINTMENT_STATUS.CHECKED_IN}`, entityType: 'Appointment', entityId: id, before: appointment, after, db: tx })
    return after
  })

const completeAppointment = ({ id, actorId }) => updateAppointmentStatus({ id, actorId, fromStatus: APPOINTMENT_STATUS.CHECKED_IN, status: APPOINTMENT_STATUS.COMPLETED, timestampField: 'completedAt' })
const markNoShow = ({ id, actorId }) => updateAppointmentStatus({ id, actorId, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.NO_SHOW, timestampField: 'noShowAt' })

export {
  listAppointmentTypes,
  listAvailabilitySchedules,
  listAppointmentSlots,
  listAppointments,
  createAppointmentType,
  createAvailabilitySchedule,
  createAppointmentSlot,
  bookAppointment,
  getMyAppointment,
  listMyAppointments,
  cancelAppointment,
  cancelManagedAppointment,
  checkInAppointment,
  completeAppointment,
  markNoShow,
}
