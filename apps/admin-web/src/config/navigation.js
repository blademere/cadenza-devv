import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'

// Navigation is a frontend presentation concern. Each protected item declares
// the exact server permission required to see it. The server remains the
// security authority and independently enforces the same permission on APIs.
export const navigation = Object.freeze([
  {
    key: 'dashboard',
    name: 'Dashboard',
    route: '/dashboard',
    icon: DashboardOutlinedIcon,
  },
  {
    key: 'users',
    name: 'Users',
    route: '/authorization/users',
    permission: 'users:read',
    icon: PeopleOutlinedIcon,
  },
  {
    key: 'authorization',
    name: 'Authorization',
    route: '/authorization',
    permission: 'authorization:manage',
    icon: AdminPanelSettingsOutlinedIcon,
  },
  // Add application navigation here when the corresponding admin-web route
  // exists. Its visibility contract is intentionally explicit:
  // permission: 'applications:read'.
])

export function getNavigationItem(item) {
  return { ...item }
}

export function normalizeNavigation(items = [], permissions = []) {
  if (!Array.isArray(items)) return []

  const permissionSet = new Set(
    Array.isArray(permissions) ? permissions : [],
  )

  return items
    .filter((item) => {
      if (!item || typeof item.route !== 'string' || !item.route.length) {
        return false
      }

      if (!item.permission) return true
      return permissionSet.has(item.permission)
    })
    .map(getNavigationItem)
}
