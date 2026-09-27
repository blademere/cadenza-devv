export function hasPermission(user, permission) {
  if (!user || !permission) {
    return false;
  }

  return user.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user, permissions = []) {
  if (!user || permissions.length === 0) {
    return false;
  }

  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user, permissions = []) {
  if (!user || permissions.length === 0) {
    return false;
  }

  return permissions.every((permission) => hasPermission(user, permission));
}
