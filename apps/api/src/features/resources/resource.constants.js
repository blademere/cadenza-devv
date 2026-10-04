const RESOURCE_MODULE = 'resources'

const RESOURCE_ACTIONS = Object.freeze({
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate',
  MANAGE: 'manage',
})

const RESOURCE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
})

export {
  RESOURCE_MODULE,
  RESOURCE_ACTIONS,
  RESOURCE_STATUS,
}
