const { findPermissionForUser } = require("./rbac.repository")

const hasPermission = async (userId, moduleKey, action) => {
  const permission = await findPermissionForUser(userId, moduleKey, action)

  return Boolean(permission)
}

module.exports = {
  hasPermission,
}
