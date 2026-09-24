import { permissions } from '../config/permissions'

export function getAdministrationActions({ canManageUsers, canManageAuthorization }) {
  return [
    canManageUsers && {
      key: 'users',
      label: 'Users',
      route: '/app/users',
      permission: permissions.users.manage,
    },
    canManageAuthorization && {
      key: 'roles',
      label: 'Roles & permissions',
      route: '/app/roles',
      permission: permissions.authorization.manage,
    },
  ].filter(Boolean)
}
