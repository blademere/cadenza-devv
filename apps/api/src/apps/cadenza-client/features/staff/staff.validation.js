const { STAFF_TYPES, STAFF_STATUS } = require('./staff.constants');

function validateCreateStaff(data) {
  const errors = {};

  if (!data.personId) {
    errors.personId = 'Person ID is required';
  }

  if (!data.appId) {
    errors.appId = 'App ID is required';
  }

  if (data.staffType && !Object.values(STAFF_TYPES).includes(data.staffType)) {
    errors.staffType = 'Invalid staff type';
  }

  if (data.status && !Object.values(STAFF_STATUS).includes(data.status)) {
    errors.status = 'Invalid staff status';
  }

  return errors;
}

function validateUpdateStaff(data) {
  const errors = {};

  if (data.staffType && !Object.values(STAFF_TYPES).includes(data.staffType)) {
    errors.staffType = 'Invalid staff type';
  }

  if (data.status && !Object.values(STAFF_STATUS).includes(data.status)) {
    errors.status = 'Invalid staff status';
  }

  return errors;
}

module.exports = {
  validateCreateStaff,
  validateUpdateStaff,
};
