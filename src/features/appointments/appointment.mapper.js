const toIso = (value) => (value instanceof Date ? value.toISOString() : value)

const mapAppointmentType = (type) => {
  if (!type) return null

  return {
    id: type.id,
    name: type.name,
    description: type.description ?? null,
    durationMinutes: type.durationMinutes,
    active: type.active,
    createdAt: toIso(type.createdAt),
    updatedAt: toIso(type.updatedAt),
  }
}

const mapAppointment = (appointment) => {
  if (!appointment) return null

  return {
    id: appointment.id,
    referenceNumber: appointment.referenceNumber,
    appointmentTypeId: appointment.appointmentTypeId,
    slotId: appointment.slotId,
    userId: appointment.userId,
    status: appointment.status,
    metadata: appointment.metadata ?? null,
    notes: appointment.notes ?? null,
    scheduledAt: toIso(appointment.scheduledAt),
    checkedInAt: toIso(appointment.checkedInAt),
    completedAt: toIso(appointment.completedAt),
    noShowAt: toIso(appointment.noShowAt),
    cancelledAt: toIso(appointment.cancelledAt),
    createdAt: toIso(appointment.createdAt),
    updatedAt: toIso(appointment.updatedAt),
  }
}

const mapAppointmentSlot = (slot) => {
  if (!slot) return null

  return {
    id: slot.id,
    appointmentTypeId: slot.appointmentTypeId,
    scheduleId: slot.scheduleId ?? null,
    startsAt: toIso(slot.startsAt),
    endsAt: toIso(slot.endsAt),
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    timezone: slot.timezone,
    createdAt: toIso(slot.createdAt),
    updatedAt: toIso(slot.updatedAt),
  }
}

const mapAvailabilitySchedule = (schedule) => {
  if (!schedule) return null

  return {
    id: schedule.id,
    appointmentTypeId: schedule.appointmentTypeId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    slotDurationMinutes: schedule.slotDurationMinutes,
    capacity: schedule.capacity,
    timezone: schedule.timezone,
    active: schedule.active,
    createdAt: toIso(schedule.createdAt),
    updatedAt: toIso(schedule.updatedAt),
  }
}

module.exports = {
  mapAppointmentType,
  mapAppointment,
  mapAppointmentSlot,
  mapAvailabilitySchedule,
}
