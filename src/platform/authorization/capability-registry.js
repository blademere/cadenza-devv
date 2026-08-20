const capabilities = Object.freeze([
  {
    key: 'applications',
    name: 'Applications',
    route: '/applications',
    permission: 'applications:view',
  },
  {
    key: 'appointments',
    name: 'Appointments',
    route: '/appointments',
    permission: 'appointments:view',
  },
  {
    key: 'professionals',
    name: 'Professionals',
    route: '/professionals',
    permission: 'professionals:view',
  },
  {
    key: 'verification',
    name: 'Verification',
    route: '/verification',
    permission: 'professionals:verify',
  },
  {
    key: 'permit-types',
    name: 'Permit Types',
    route: '/permit-types',
    permission: 'permit-types:view',
  },
  {
    key: 'authorization',
    name: 'Authorization',
    route: '/authorization',
    permission: 'authorization:manage',
  },
])

const getCapabilityRegistry = () => capabilities.map((capability) => ({ ...capability }))

module.exports = { getCapabilityRegistry }
