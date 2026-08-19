const ACCESS_CONTROL_ACTIONS = Object.freeze({
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REVIEW: 'review',
  RECEIVE: 'receive',
  APPROVE: 'approve',
  REJECT: 'reject',
  UPLOAD: 'upload',
  CANCEL: 'cancel',
  CHECK_IN: 'check_in',
  NO_SHOW: 'no_show',
  MANAGE: 'manage',
})

const defineModule = (key, name, actions, description) => ({
  key,
  name,
  description,
  actions: Object.freeze([...actions]),
})

// Backend-owned capability catalog. The database stores the actual module,
// permission, and role assignments. This catalog only declares capabilities
// that the application knows how to enforce.
const ACCESS_CONTROL_MODULE_DEFINITIONS = Object.freeze([
  defineModule('users', 'Users', ['read', 'create', 'update', 'delete']),
  defineModule('applications', 'Applications', ['read', 'create', 'update', 'delete', 'review', 'receive', 'approve', 'reject']),
  defineModule('professionals', 'Professionals', ['read', 'create', 'review', 'update']),
  defineModule('documents', 'Documents', ['read', 'upload', 'delete']),
  defineModule('inspections', 'Inspections', ['read', 'create', 'update']),
  defineModule('reports', 'Reports', ['read']),
  defineModule('appointments', 'Appointments', ['read', 'create', 'update', 'cancel', 'check_in', 'no_show', 'manage']),
  defineModule('notifications', 'Notifications', ['read', 'manage']),
  defineModule('audit_logs', 'Audit Logs', ['read']),
])

const getPermissionKey = (resource, action) => `${resource}:${action}`

const getPermissionDefinitions = () => ACCESS_CONTROL_MODULE_DEFINITIONS.flatMap((module) =>
  module.actions.map((action) => ({
    moduleKey: module.key,
    moduleName: module.name,
    moduleDescription: module.description,
    action,
    key: getPermissionKey(module.key, action),
  })),
)

const ACCESS_CONTROL_MODULES = Object.freeze(
  Object.fromEntries(ACCESS_CONTROL_MODULE_DEFINITIONS.map((module) => [
    module.key.toUpperCase(),
    module.key,
  ])),
)

module.exports = {
  ACCESS_CONTROL_ACTIONS,
  ACCESS_CONTROL_MODULE_DEFINITIONS,
  ACCESS_CONTROL_MODULES,
  getPermissionKey,
  getPermissionDefinitions,
}
