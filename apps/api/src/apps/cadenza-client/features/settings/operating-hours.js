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

export const getOperatingHoursForDate = (config, date) => {
  const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const effectiveKey = config?.defaultEffectiveFrom ? getDateKey(new Date(config.defaultEffectiveFrom)) : null;
  const weeklyHours = effectiveKey && key < effectiveKey && config.previousWeeklyHours
    ? config.previousWeeklyHours
    : config?.weeklyHours;
  return config?.dateOverrides?.[key] || weeklyHours?.[String(date.getDay())] || DEFAULT_WEEKLY_HOURS[String(date.getDay())];
};

export const getOperationalEnd = (config, date) => {
  const hours = getOperatingHoursForDate(config, date);
  if (!hours || hours.isClosed) return null;
  const end = new Date(date);
  const [hour, minute] = hours.endTime.split(':').map(Number);
  end.setHours(hour, minute, 0, 0);
  return end;
};

// Rental time is measured only while the facility is open. This lets a rental
// continue into the next operating day without counting overnight/closed time.
export const getOperationalMinutesBetween = (config, start, end) => {
  if (!(start instanceof Date) || !(end instanceof Date) || end <= start) return 0;

  let totalMinutes = 0;
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  for (let index = 0; index < 370 && day <= lastDay; index += 1) {
    const hours = getOperatingHoursForDate(config, day);
    if (hours && !hours.isClosed) {
      const opening = new Date(day);
      const closing = new Date(day);
      const [openHour, openMinute] = hours.startTime.split(':').map(Number);
      const [closeHour, closeMinute] = hours.endTime.split(':').map(Number);
      opening.setHours(openHour, openMinute, 0, 0);
      closing.setHours(closeHour, closeMinute, 0, 0);

      const overlapStart = Math.max(start.getTime(), opening.getTime());
      const overlapEnd = Math.min(end.getTime(), closing.getTime());
      if (overlapEnd > overlapStart) {
        totalMinutes += (overlapEnd - overlapStart) / (1000 * 60);
      }
    }
    day.setDate(day.getDate() + 1);
  }

  return totalMinutes;
};

export const assertWithinOperatingHours = (config, start, end) => {
  const opening = getOperatingHoursForDate(config, start);
  if (!opening || opening.isClosed) throw new Error('The facility is closed on the selected date.');
  if (getDateKey(start) === getDateKey(new Date()) && start < new Date()) {
    throw new Error('The selected start time has already passed.');
  }
  const operationalStart = new Date(start);
  const operationalEnd = new Date(start);
  const [startHour, startMinute] = opening.startTime.split(':').map(Number);
  const [endHour, endMinute] = opening.endTime.split(':').map(Number);
  operationalStart.setHours(startHour, startMinute, 0, 0);
  operationalEnd.setHours(endHour, endMinute, 0, 0);
  if (start < operationalStart || end > operationalEnd) {
    throw new Error(`The selected time must be within operating hours (${opening.startTime}–${opening.endTime}).`);
  }
};

export const assertRentalStartWithinOperatingHours = (config, start) => {
  const opening = getOperatingHoursForDate(config, start);
  if (!opening || opening.isClosed) throw new Error('The facility is closed on the selected date.');
  const operationalStart = new Date(start);
  const operationalEnd = new Date(start);
  const [startHour, startMinute] = opening.startTime.split(':').map(Number);
  const [endHour, endMinute] = opening.endTime.split(':').map(Number);
  operationalStart.setHours(startHour, startMinute, 0, 0);
  operationalEnd.setHours(endHour, endMinute, 0, 0);
  if (start < operationalStart || start >= operationalEnd) {
    throw new Error(`The rental start time must be within operating hours (${opening.startTime}–${opening.endTime}).`);
  }
  if (getDateKey(start) === getDateKey(new Date()) && start < new Date()) {
    throw new Error('The selected start time has already passed.');
  }
};
