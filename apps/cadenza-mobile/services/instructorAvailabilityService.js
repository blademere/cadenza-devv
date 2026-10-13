import api from './api';
import { isMockDataEnabled } from './dataMode';
import { mockInstructorData } from './mockData';

let mockRows = mockInstructorData.availability.map((row) => ({ ...row, time_slot: { ...row.time_slot } }));

function wrap(data) {
  return { data: { success: true, data } };
}

function findTimeSlot(id) {
  const slot = mockInstructorData.timeSlots.find((item) => item.id === id);
  if (!slot) throw new Error('The selected time is not available.');
  return slot;
}

function toMinutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function fromMinutes(value) {
  const hour = Math.floor(value / 60).toString().padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}:00`;
}

function normalizeAvailabilityRow(row) {
  if (row.day_of_week && row.time_slot) return row;

  const dayOfWeek = Number(row.dayOfWeek);
  const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOfWeek - 1];
  const start = row.startMinute ?? row.start_minute;
  const end = row.endMinute ?? row.end_minute;
  const startTime = start == null ? null : fromMinutes(Number(start));
  const endTime = end == null ? null : fromMinutes(Number(end));
  const slot = mockInstructorData.timeSlots.find((item) =>
    item.start_time === startTime && item.end_time === endTime);

  return {
    ...row,
    day_of_week: day ?? row.day_of_week,
    time_slot_id: row.time_slot_id ?? slot?.id ?? null,
    time_slot: row.time_slot ?? (startTime && endTime ? { start_time: startTime, end_time: endTime } : null),
  };
}

function toApiPayload(day, timeSlotId) {
  const slot = findTimeSlot(timeSlotId);
  const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day) + 1;
  if (!dayOfWeek) throw new Error('Select a valid day.');
  return {
    dayOfWeek,
    startMinute: toMinutes(slot.start_time),
    endMinute: toMinutes(slot.end_time),
  };
}

export async function getAvailability() {
  if (await isMockDataEnabled()) return wrap(mockRows);
  const response = await api.get('/instructor/availability');
  const payload = response.data?.data ?? response.data;
  const rows = Array.isArray(payload) ? payload : payload?.items ?? [];
  return { ...response, data: { ...response.data, data: rows.map(normalizeAvailabilityRow) } };
}

export async function createAvailability(day, timeSlotId) {
  const payload = toApiPayload(day, timeSlotId);
  if (await isMockDataEnabled()) {
    const slot = findTimeSlot(timeSlotId);
    const row = {
      id: `mock-availability-${Date.now()}`,
      day_of_week: day,
      time_slot_id: timeSlotId,
      time_slot: { start_time: slot.start_time, end_time: slot.end_time },
    };
    mockRows = [...mockRows, row];
    return wrap(row);
  }
  return api.post('/instructor/availability', payload);
}

export async function updateAvailability(id, day, timeSlotId) {
  const payload = toApiPayload(day, timeSlotId);
  if (await isMockDataEnabled()) {
    const slot = findTimeSlot(timeSlotId);
    mockRows = mockRows.map((row) => row.id === id
      ? { ...row, day_of_week: day, time_slot_id: timeSlotId, time_slot: { start_time: slot.start_time, end_time: slot.end_time } }
      : row);
    return wrap(mockRows.find((row) => row.id === id) ?? null);
  }
  return api.patch(`/instructor/availability/${id}`, payload);
}

export async function deleteAvailability(id) {
  if (await isMockDataEnabled()) {
    mockRows = mockRows.filter((row) => row.id !== id);
    return wrap(null);
  }
  return api.delete(`/instructor/availability/${id}`);
}
