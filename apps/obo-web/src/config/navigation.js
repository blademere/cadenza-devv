import { createElement } from 'react'

const Icon = ({ children }) =>
  createElement(
    'span',
    {
      'aria-hidden': true,
      style: {
        width: 20,
        height: 20,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    children,
  )

const DashboardIcon = () => Icon({ children: '⌂' })
const UsersIcon = () => Icon({ children: '♙' })
const RolesIcon = () => Icon({ children: '◆' })

export const navigation = Object.freeze([
  {
    key: 'workspace',
    name: 'Workspace',
    items: [
      {
        key: 'dashboard',
        name: 'Dashboard',
        route: '/dashboard',
        icon: DashboardIcon,
      },
    ],
  },
  {
    key: 'administration',
    name: 'Administration',
    items: [
      {
        key: 'users',
        name: 'Users',
        route: '/users',
        requiredPermissions: ['users:manage'],
        icon: UsersIcon,
      },
      {
        key: 'roles',
        name: 'Roles & Permissions',
        route: '/roles',
        requiredPermissions: ['authorization:manage'],
        icon: RolesIcon,
      },
    ],
  },
])

export function getNavigationItem(item) {
  return { ...item }
}

function hasRequiredPermissions(item, permissionSet) {
  if (!Array.isArray(item.requiredPermissions) || item.requiredPermissions.length === 0) {
    return true
  }

  return item.requiredPermissions.every((permission) => permissionSet.has(permission))
}

export function normalizeNavigation(sections = [], permissions = []) {
  if (!Array.isArray(sections)) return []

  const permissionSet = new Set(Array.isArray(permissions) ? permissions : [])

  return sections
    .filter((section) => section && Array.isArray(section.items))
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => {
          if (!item || typeof item.route !== 'string' || !item.route.length) return false
          return hasRequiredPermissions(item, permissionSet)
        })
        .map(getNavigationItem),
    }))
    .filter((section) => section.items.length > 0)
}
