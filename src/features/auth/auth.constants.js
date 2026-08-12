const AUTH_ROLES = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  EMPLOYER: "employer",
  APPLICANT: "applicant",
});

const AUTH_ROLE_VALUES = Object.freeze(Object.values(AUTH_ROLES));

module.exports = {
  AUTH_ROLES,
  AUTH_ROLE_VALUES,
};
