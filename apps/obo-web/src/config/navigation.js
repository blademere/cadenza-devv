import { createElement } from 'react'
import {
  Archive,
  CalendarBlank,
  ClipboardText,
  FileText,
  MagnifyingGlass,
  ShieldCheck,
  UserCheck,
  UsersThree,
} from '@phosphor-icons/react'
import { permissions } from './permissions'

const iconProps = {
  size: 20,
  weight: 'regular',
  'aria-hidden': true,
}

const createIcon = (Icon) => () => createElement(Icon, iconProps)

const DashboardIcon = createIcon(Archive)
const ApplicationsIcon = createIcon(FileText)
const AppointmentsIcon = createIcon(CalendarBlank)
const PermitTypesIcon = createIcon(ClipboardText)
const ReceivingIcon = createIcon(Archive)
const ProfessionalsIcon = createIcon(UsersThree)
const VerificationIcon = createIcon(UserCheck)
const InspectionsIcon = createIcon(MagnifyingGlass)
const UsersIcon = createIcon(UsersThree)
const RolesIcon = createIcon(ShieldCheck)

export const navigation = Object.freeze([
  {
    key: 'workspace',
    name: 'Workspace',
    items: [
      {
        key: 'dashboard',
        name: 'Dashboard',
        route: '/app/dashboard',
        icon: DashboardIcon,
      },
    ],
  },
  {
    key: 'plan-permits',
    name: 'Plan Permits',
    items: [
      {
        key: 'applications',
        name: 'Applications',
        route: '/app/applications',
        requiredPermissions: [permissions.planPermits.read],
        icon: ApplicationsIcon,
      },
      {
        key: 'appointments',
        name: 'Appointments',
        route: '/app/appointments',
        requiredPermissions: [permissions.appointments.read],
        icon: AppointmentsIcon,
      },
      {
        key: 'permit-types',
        name: 'Permit Types',
        route: '/app/permit-types',
        requiredPermissions: [permissions.planPermits.read],
        icon: PermitTypesIcon,
      },
    ],
  },
  {
    key: 'operations',
    name: 'Operations',
    items: [
      {
        key: 'receiving',
        name: 'Receiving',
        route: '/app/receiving',
        requiredPermissions: [permissions.planPermits.receive],
        icon: ReceivingIcon,
      },
      {
        key: 'professionals',
        name: 'Professionals',
        route: '/app/professionals',
        requiredPermissions: [permissions.professionals.read],
        icon: ProfessionalsIcon,
      },
      {
        key: 'professional-verification',
        name: 'Professional Verification',
        route: '/app/professionals/verification',
        requiredPermissions: [permissions.professionals.review],
        icon: VerificationIcon,
      },
      {
        key: 'inspections',
        name: 'Inspections',
        route: '/app/inspections',
        requiredPermissions: [permissions.planPermits.inspect],
        icon: InspectionsIcon,
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
        route: '/app/users',
        requiredPermissions: [permissions.users.manage],
        icon: UsersIcon,
      },
      {
        key: 'roles',
        name: 'Roles & Permissions',
        route: '/app/roles',
        requiredPermissions: [permissions.authorization.manage],
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
