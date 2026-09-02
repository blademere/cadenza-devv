const mapAppointmentType = (type) => {
  if (!type) return null

  return {
    id: type.id,
    key: type.key,
    name: type.name,
    description: type.description ?? null,
    defaultDurationMinutes: type.defaultDurationMinutes,
    defaultCapacity: type.defaultCapacity,
    isActive: type.isActive,
    createdAt: type.createdAt,
    updatedAt: type.updatedAt,
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
    cancelledAt: appointment.cancelledAt ?? null,
    checkedInAt: appointment.checkedInAt ?? null,
    completedAt: appointment.completedAt ?? null,
    noShowAt: appointment.noShowAt ?? null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }
}

const mapAppointmentSlot = (slot) => {
  if (!slot) return null

  return {
    id: slot.id,
    appointmentTypeId: slot.appointmentTypeId,
    scheduleId: slot.scheduleId ?? null,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
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
    timezone: schedule.timezone,
    slotDurationMinutes: schedule.slotDurationMinutes,
    capacity: schedule.capacity,
    isActive: schedule.isActive,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  }
}

export {
  mapAppointmentType,
  mapAppointment,
  mapAppointmentSlot,
  mapAvailabilitySchedule,
}
