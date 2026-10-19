import { apiClient } from '@/core/api/apiClient';

const DEFAULT_ENTRY = { isClosed: false, startTime: '08:00', endTime: '17:00' };
const DEFAULT_WEEKLY = Object.fromEntries(Array.from({ length: 7 }, (_, day) => [String(day), DEFAULT_ENTRY]));
const MANILA_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getManilaParts = (date) => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
}).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

export async function getOperatingHours() {
  const response = await apiClient.get('/settings/operating-hours');
  return response?.data?.data ?? response?.data ?? response;
}

export function getHoursForDate(config, date) {
  const value = date instanceof Date ? date : new Date(`${date}T00:00:00+08:00`);
  const parts = getManilaParts(value);
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = MANILA_WEEKDAYS.indexOf(parts.weekday);
  const effectiveDate = config?.defaultEffectiveFrom ? new Date(config.defaultEffectiveFrom) : null;
  const effectiveParts = effectiveDate ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(effectiveDate).reduce((result, part) => ({ ...result, [part.type]: part.value }), {}) : null;
  const effectiveKey = effectiveParts ? `${effectiveParts.year}-${effectiveParts.month}-${effectiveParts.day}` : null;
  const weekly = effectiveKey && key < effectiveKey && config?.previousWeeklyHours ? config.previousWeeklyHours : config?.weeklyHours;
  return config?.dateOverrides?.[key] || weekly?.[String(weekday)] || DEFAULT_WEEKLY[String(weekday)];
}

export function isWithinOperatingHours(config, start, end) {
  const startsAt = start instanceof Date ? start : new Date(start);
  const endsAt = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return false;
  const hours = getHoursForDate(config, startsAt);
  const startKey = getManilaParts(startsAt);
  const endKey = getManilaParts(endsAt);
  if (!hours || hours.isClosed || `${startKey.year}-${startKey.month}-${startKey.day}` !== `${endKey.year}-${endKey.month}-${endKey.day}`) return false;
  const dateKey = `${startKey.year}-${startKey.month}-${startKey.day}`;
  const opening = new Date(`${dateKey}T${hours.startTime}:00+08:00`);
  const closing = new Date(`${dateKey}T${hours.endTime}:00+08:00`);
  return startsAt >= opening && endsAt <= closing && endsAt > startsAt;
}
