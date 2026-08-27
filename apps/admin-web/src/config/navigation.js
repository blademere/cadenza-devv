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

// Navigation is a frontend presentation concern. Each protected item declares
// the exact server permission required to see it. The server remains the
// security authority and independently enforces the same permission on APIs.
export const navigation = Object.freeze([
  {
    key: 'dashboard',
    name: 'Dashboard',
    route: '/dashboard',
    icon: DashboardIcon,
  },
  {
    key: 'users',
    name: 'Users',
    route: '/authorization/users',
    permission: 'users:manage',
    icon: UsersIcon,
  },
  {
    key: 'roles',
    name: 'Roles',
    route: '/authorization',
    permission: 'authorization:manage',
    icon: RolesIcon,
  },
])

export function getNavigationItem(item) {
  return { ...item }
}

export function normalizeNavigation(items = [], permissions = []) {
  if (!Array.isArray(items)) return []

  const permissionSet = new Set(Array.isArray(permissions) ? permissions : [])

  return items
    .filter((item) => {
      if (!item || typeof item.route !== 'string' || !item.route.length) return false
      if (!item.permission) return true
      return permissionSet.has(item.permission)
    })
    .map(getNavigationItem)
}
