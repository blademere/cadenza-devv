export const permissions = Object.freeze({
  applications: Object.freeze({
    read: 'obo_applications:read',
    create: 'obo_applications:create',
    update: 'obo_applications:update',
    submit: 'obo_applications:submit',
    scheduleSubmission: 'obo_applications:schedule_submission',
    receive: 'obo_applications:receive',
  }),
  permitTypes: Object.freeze({
    read: 'obo_permit_types:read',
    create: 'obo_permit_types:create',
    update: 'obo_permit_types:update',
  }),
  forms: Object.freeze({
    read: 'obo_forms:read',
    create: 'obo_forms:create',
    update: 'obo_forms:update',
    publish: 'obo_forms:publish',
  }),
  appointments: Object.freeze({
    read: 'obo_appointments:read',
    create: 'obo_appointments:create',
    manage: 'obo_appointments:manage',
    cancel: 'obo_appointments:cancel',
    checkIn: 'obo_appointments:check_in',
  }),
  professionals: Object.freeze({
    read: 'obo_professionals:read',
    create: 'obo_professionals:create',
    update: 'obo_professionals:update',
    review: 'obo_professionals:review',
  }),
  users: Object.freeze({
    manage: 'obo_users:manage',
  }),
  authorization: Object.freeze({
    manage: 'obo_authorization:manage',
  }),
})

export const permissionList = Object.freeze([
  ...Object.values(permissions.applications),
  ...Object.values(permissions.permitTypes),
  ...Object.values(permissions.forms),
  ...Object.values(permissions.professionals),
  ...Object.values(permissions.users),
  ...Object.values(permissions.authorization),
  ...Object.values(permissions.appointments),
])
