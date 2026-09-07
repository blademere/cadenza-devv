export const permissions = Object.freeze({
  planPermits: Object.freeze({
    read: 'obo_plan_permits:read',
    create: 'obo_plan_permits:create',
    update: 'obo_plan_permits:update',
    submit: 'obo_plan_permits:submit',
    scheduleSubmission: 'obo_plan_permits:schedule_submission',
    receive: 'obo_plan_permits:receive',
  }),
  appointments: Object.freeze({
    read: 'appointments:read',
    create: 'appointments:create',
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
  ...Object.values(permissions.appointments),
  ...Object.values(permissions.professionals),
  ...Object.values(permissions.users),
  ...Object.values(permissions.authorization),
])
