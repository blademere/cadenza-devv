export const DEFAULT_WEEKLY_HOURS = {
  '0': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '1': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '2': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '3': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '4': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '5': { isClosed: false, startTime: '08:00', endTime: '17:00' },
  '6': { isClosed: false, startTime: '08:00', endTime: '17:00' },
};

export const validateHours = (weeklyHours, dateOverrides) => {
  const timePattern = /^([01]\d|2[0-3]):(?:00|30)$/;
  const validateEntry = (entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid operating-hours entry.');
    if (entry.isClosed) return;
    if (!timePattern.test(entry.startTime) || !timePattern.test(entry.endTime)) {
      throw new Error('Operating hours must use valid HH:mm times.');
    }
    if (entry.startTime >= entry.endTime) throw new Error('Closing time must be later than opening time.');
  };
  Object.values(weeklyHours || {}).forEach(validateEntry);
  Object.values(dateOverrides || {}).forEach(validateEntry);
};

export const getDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getManilaWeekday = (date) => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
};

// The application operating-hours timezone is Asia/Manila (UTC+08:00).
// Convert a Manila calendar date/time into the actual instant before comparing
// it with ISO timestamps received by the API.
const getManilaDateTime = (date, time) =>
  new Date(`${getDateKey(date)}T${time}:00+08:00`);

export const getOperatingHoursForDate = (config, date) => {
  const key = getDateKey(date);
  const weekday = getManilaWeekday(date);
  const effectiveKey = config?.defaultEffectiveFrom ? getDateKey(new Date(config.defaultEffectiveFrom)) : null;
  const weeklyHours = effectiveKey && key < effectiveKey && config.previousWeeklyHours
    ? config.previousWeeklyHours
    : config?.weeklyHours;
  return config?.dateOverrides?.[key] || weeklyHours?.[String(weekday)] || DEFAULT_WEEKLY_HOURS[String(weekday)];
};

export const getOperationalEnd = (config, date) => {
  const hours = getOperatingHoursForDate(config, date);
  if (!hours || hours.isClosed) return null;
  return getManilaDateTime(date, hours.endTime);
};

// Rental time is measured only while the facility is open. This lets a rental
// continue into the next operating day without counting overnight/closed time.
export const getOperationalMinutesBetween = (config, start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date) || end <= start) return 0;

  let totalMinutes = 0;
  const day = new Date(`${getDateKey(start)}T00:00:00+08:00`);
  const lastDay = new Date(`${getDateKey(end)}T00:00:00+08:00`);

  for (let index = 0; index < 370 && day <= lastDay; index += 1) {
    const hours = getOperatingHoursForDate(config, day);
    if (hours && !hours.isClosed) {
      const opening = getManilaDateTime(day, hours.startTime);
      const closing = getManilaDateTime(day, hours.endTime);

      const overlapStart = Math.max(start.getTime(), opening.getTime());
      const overlapEnd = Math.min(end.getTime(), closing.getTime());
      if (overlapEnd > overlapStart) {
        totalMinutes += (overlapEnd - overlapStart) / (1000 * 60);
      }
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return totalMinutes;
};

export const assertWithinOperatingHours = (config, start, end) => {
  const opening = getOperatingHoursForDate(config, start);
  if (!opening || opening.isClosed) throw new Error('The facility is closed on the selected date.');
  if (getDateKey(start) === getDateKey(new Date()) && start < new Date()) {
    throw new Error('The selected start time has already passed.');
  }
  const operationalStart = getManilaDateTime(start, opening.startTime);
  const operationalEnd = getManilaDateTime(start, opening.endTime);
  if (start < operationalStart || end > operationalEnd) {
    throw new Error(`The selected time must be within operating hours (${opening.startTime}–${opening.endTime}).`);
  }
};

export const assertRentalStartWithinOperatingHours = (config, start) => {
  const opening = getOperatingHoursForDate(config, start);
  if (!opening || opening.isClosed) throw new Error('The facility is closed on the selected date.');
  const operationalStart = getManilaDateTime(start, opening.startTime);
  const operationalEnd = getManilaDateTime(start, opening.endTime);
  if (start < operationalStart || start >= operationalEnd) {
    throw new Error(`The rental start time must be within operating hours (${opening.startTime}–${opening.endTime}).`);
  }
  if (getDateKey(start) === getDateKey(new Date()) && start < new Date()) {
    throw new Error('The selected start time has already passed.');
  }
};
