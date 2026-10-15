import { apiClient } from '@/core/api/apiClient';

const DEFAULT_ENTRY = { isClosed: false, startTime: '08:00', endTime: '17:00' };
const DEFAULT_WEEKLY = Object.fromEntries(Array.from({ length: 7 }, (_, day) => [String(day), DEFAULT_ENTRY]));

export async function getOperatingHours() {
  const response = await apiClient.get('/settings/operating-hours');
  return response?.data?.data ?? response?.data ?? response;
}

export function getHoursForDate(config, date) {
  const value = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const effectiveDate = config?.defaultEffectiveFrom ? new Date(config.defaultEffectiveFrom) : null;
  const effectiveParts = effectiveDate ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(effectiveDate).reduce((result, part) => ({ ...result, [part.type]: part.value }), {}) : null;
  const effectiveKey = effectiveParts ? `${effectiveParts.year}-${effectiveParts.month}-${effectiveParts.day}` : null;
  const weekly = effectiveKey && key < effectiveKey && config?.previousWeeklyHours ? config.previousWeeklyHours : config?.weeklyHours;
  return config?.dateOverrides?.[key] || weekly?.[String(value.getDay())] || DEFAULT_WEEKLY[String(value.getDay())];
}

export function isWithinOperatingHours(config, start, end) {
  const startsAt = start instanceof Date ? start : new Date(start);
  const endsAt = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return false;
  const hours = getHoursForDate(config, startsAt);
  if (!hours || hours.isClosed || startsAt.toDateString() !== endsAt.toDateString()) return false;
  const [openHour, openMinute] = hours.startTime.split(':').map(Number);
  const [closeHour, closeMinute] = hours.endTime.split(':').map(Number);
  const opening = new Date(startsAt); opening.setHours(openHour, openMinute, 0, 0);
  const closing = new Date(startsAt); closing.setHours(closeHour, closeMinute, 0, 0);
  return startsAt >= opening && endsAt <= closing && endsAt > startsAt;
}
