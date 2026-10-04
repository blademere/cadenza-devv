export function validateCreateInstructor(data) {
  const errors = {};

  if (!data.personId) {
    errors.personId = 'Person ID is required';
  }

  if (
    data.status &&
    !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(data.status)
  ) {
    errors.status = 'Invalid instructor status';
  }

  return errors;
}

export function validateUpdateInstructor(data) {
  const errors = {};

  if (
    data.status &&
    !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(data.status)
  ) {
    errors.status = 'Invalid instructor status';
  }

  return errors;
}

export function validateAvailability(data) {
  const errors = {};

  const dayOfWeek = Number(data.dayOfWeek);
  const startMinute = Number(data.startMinute);
  const endMinute = Number(data.endMinute);

  if (
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7
  ) {
    errors.dayOfWeek = 'Day must be between 1 and 7';
  }

  if (
    !Number.isInteger(startMinute) ||
    startMinute < 0 ||
    startMinute > 1440
  ) {
    errors.startMinute = 'Invalid start time';
  }

  if (
    !Number.isInteger(endMinute) ||
    endMinute < 0 ||
    endMinute > 1440
  ) {
    errors.endMinute = 'Invalid end time';
  }

  if (
    Number.isInteger(startMinute) &&
    Number.isInteger(endMinute) &&
    startMinute >= endMinute
  ) {
    errors.time = 'Start time must be before end time';
  }

  return errors;
}

export function validateInstructorBlock(data) {
  const errors = {};

  if (!data.startsAt) {
    errors.startsAt = 'Start date and time is required';
  }

  if (!data.endsAt) {
    errors.endsAt = 'End date and time is required';
  }

  if (
    data.startsAt &&
    data.endsAt &&
    new Date(data.startsAt) >= new Date(data.endsAt)
  ) {
    errors.time = 'Start must be before end';
  }

  return errors;
}