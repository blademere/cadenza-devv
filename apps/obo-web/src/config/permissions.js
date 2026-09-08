export const permissions = Object.freeze({
  planPermits: Object.freeze({
    read: 'obo_plan_permits:read',
    create: 'obo_plan_permits:create',
    update: 'obo_plan_permits:update',
    submit: 'obo_plan_permits:submit',
    scheduleSubmission: 'obo_plan_permits:schedule_submission',
    receive: 'obo_plan_permits:receive',
    inspect: 'obo_plan_permits:inspect',
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
    read: 'appointments:read',
    create: 'appointments:create',
    manage: 'appointments:manage',
    cancel: 'appointments:cancel',
  }),
  professionals: Object.freeze({
    read: 'obo_professionals:read',
    create: 'obo_professionals:create',
    review: 'obo_professionals:review',
  }),
  users: Object.freeze({
    manage: 'users:manage',
  }),
  authorization: Object.freeze({
    manage: 'authorization:manage',
  }),
})

export const permissionList = Object.freeze([
  ...Object.values(permissions.planPermits),
  ...Object.values(permissions.permitTypes),
  ...Object.values(permissions.forms),
  ...Object.values(permissions.professionals),
  ...Object.values(permissions.users),
  ...Object.values(permissions.authorization),
  ...Object.values(permissions.appointments),
])
