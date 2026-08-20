const capabilities = Object.freeze([
  {
    key: 'applications',
    moduleKey: 'obo_plan_permits',
    name: 'Applications',
    route: '/applications',
    permission: 'obo_plan_permits:read',
  },
  {
    key: 'appointments',
    moduleKey: 'obo_plan_permits',
    name: 'Appointments',
    route: '/appointments',
    permission: 'obo_plan_permits:read',
  },
  {
    key: 'professionals',
    moduleKey: 'obo_professionals',
    name: 'Professionals',
    route: '/professionals',
    permission: 'obo_professionals:read',
  },
  {
    key: 'verification',
    moduleKey: 'obo_professionals',
    name: 'Professional Verification',
    route: '/professionals/verification',
    permission: 'obo_professionals:review',
  },
  {
    key: 'permit-types',
    moduleKey: 'obo_plan_permits',
    name: 'Permit Types',
    route: '/permit-types',
    permission: 'obo_plan_permits:read',
  },
  {
    key: 'receiving',
    moduleKey: 'obo_plan_permits',
    name: 'Receiving',
    route: '/receiving',
    permission: 'obo_plan_permits:receive',
  },
  {
    key: 'authorization',
    moduleKey: 'authorization',
    name: 'Authorization',
    route: '/authorization',
    permission: 'authorization:manage',
  },
])

const getCapabilityRegistry = () => capabilities.map((capability) => ({ ...capability }))

module.exports = { getCapabilityRegistry }
