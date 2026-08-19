const {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
  getPermissionKey,
} = require('./access-control.registry')

const ACCESS_CONTROL_POSSESSION = Object.freeze({
  OWN: 'own',
  ANY: 'any',
})

// Keep this compatibility export for callers that use named permission keys.
// The database-backed permission catalog is maintained by the registry/seed
// and authorization checks resolve against PostgreSQL rather than this list.
const ACCESS_CONTROL_PERMISSION_KEYS = Object.freeze(
  new Proxy({}, {
    get(_target, property) {
      if (typeof property !== 'string') return undefined
      const separator = property.lastIndexOf('_')
      if (separator <= 0) return undefined
      const resource = property.slice(0, separator).toLowerCase()
      const action = property.slice(separator + 1).toLowerCase()
      return getPermissionKey(resource, action)
    },
  }),
)

module.exports = {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
  ACCESS_CONTROL_POSSESSION,
  ACCESS_CONTROL_PERMISSION_KEYS,
  getPermissionKey,
}
