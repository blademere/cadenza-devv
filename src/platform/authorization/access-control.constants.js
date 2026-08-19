const {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
  ACCESS_CONTROL_MODULE_DEFINITIONS,
  getPermissionKey,
} = require('./access-control.registry')

const ACCESS_CONTROL_POSSESSION = Object.freeze({
  OWN: 'own',
  ANY: 'any',
})

// Compatibility aliases for code that wants stable symbolic permission names.
// The catalog itself is maintained by the registry and database seed, so adding
// a module/action does not require manually maintaining this object.
const ACCESS_CONTROL_PERMISSION_KEYS = Object.freeze(
  Object.fromEntries(
    ACCESS_CONTROL_MODULE_DEFINITIONS.flatMap((module) =>
      module.actions.map((action) => [
        `${module.key}_${action}`.toUpperCase(),
        getPermissionKey(module.key, action),
      ]),
    ),
  ),
)

module.exports = {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
  ACCESS_CONTROL_POSSESSION,
  ACCESS_CONTROL_PERMISSION_KEYS,
  getPermissionKey,
}
