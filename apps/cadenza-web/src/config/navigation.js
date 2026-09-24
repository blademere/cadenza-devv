import { createElement } from 'react'
import { Archive, Calendar, Guitar, House, MusicNotes, UsersThree } from '@phosphor-icons/react'
import { PERMISSIONS } from './permissions'

const icon = (I) => () => createElement(I, { size: 20, weight: 'regular', 'aria-hidden': true })

export const navigation = Object.freeze([
  {
    key: 'workspace',
    name: 'Workspace',
    items: [{ key: 'dashboard', name: 'Dashboard', route: '/app/dashboard', icon: icon(House) }],
  },
  {
    key: 'customer',
    name: 'Customer',
    items: [
      { key: 'my-lessons', name: 'My Lessons', route: '/app/my-lessons', icon: icon(MusicNotes), anyPermissions: [PERMISSIONS.enrollments.create, PERMISSIONS.enrollments.read] },
      { key: 'my-rentals', name: 'My Rentals', route: '/app/my-rentals', icon: icon(Guitar), anyPermissions: [PERMISSIONS.rentals.create, PERMISSIONS.rentals.read] },
    ],
  },
  {
    key: 'instructor',
    name: 'Instructor',
    items: [
      { key: 'my-teaching', name: 'My Teaching', route: '/app/my-teaching', icon: icon(MusicNotes), permission: PERMISSIONS.lessons.attendance },
    ],
  },
  {
    key: 'lessons-management',
    name: 'Lesson Management',
    items: [
      { key: 'lesson-management', name: 'Lesson Management', route: '/app/lessons', icon: icon(MusicNotes), anyPermissions: [PERMISSIONS.lessons.read, PERMISSIONS.lessons.create, PERMISSIONS.lessons.manage, PERMISSIONS.lessons.schedule] },
      { key: 'audit', name: 'Audit', route: '/app/audit', icon: icon(Calendar), permission: PERMISSIONS.audit.read },
    ],
  },
  {
    key: 'rentals-management',
    name: 'Rental Management',
    items: [
      { key: 'rental-management', name: 'Rental Management', route: '/app/rentals', icon: icon(Guitar), permission: PERMISSIONS.rentals.manage },
      { key: 'resources', name: 'Resources', route: '/app/resources', icon: icon(Archive), anyPermissions: [PERMISSIONS.instruments.create, PERMISSIONS.instruments.update, PERMISSIONS.rooms.create, PERMISSIONS.rooms.update] },
    ],
  },
  {
    key: 'administration',
    name: 'Administration',
    items: [{ key: 'users', name: 'Users', route: '/app/users', icon: icon(UsersThree), permission: PERMISSIONS.customers.manage }],
  },
])

export function normalizeNavigation(sections = [], permissions = []) {
  if (!Array.isArray(sections)) return []

  return sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items)
        ? section.items
            .filter((item) => !item.permission || permissions.includes(item.permission))
            .filter(
              (item) =>
                !item.anyPermissions ||
                item.anyPermissions.some((permission) => permissions.includes(permission)),
            )
        : [],
    }))
    .filter((section) => section.items.length)
}