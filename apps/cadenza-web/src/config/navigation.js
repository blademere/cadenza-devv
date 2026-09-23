import { createElement } from 'react'
import { Archive, Calendar, Guitar, House, MusicNotes, UsersThree } from '@phosphor-icons/react'
import { PERMISSIONS } from './permissions'

const icon = (I) => () => createElement(I, { size: 20, weight: 'regular', 'aria-hidden': true })

export const navigation = Object.freeze([
  {
    key: 'workspace',
    name: 'Workspace',
    items: [
      { key: 'dashboard', name: 'Dashboard', route: '/app/dashboard', icon: icon(House) },
    ],
  },
  {
    key: 'lessons',
    name: 'Music Lessons',
    items: [
      { key: 'lessons', name: 'Lessons', route: '/app/lessons', icon: icon(MusicNotes), permission: PERMISSIONS.lessons.read },
      { key: 'payments', name: 'Payments', route: '/app/payments', icon: icon(Calendar), permission: PERMISSIONS.payments.read },
      { key: 'audit', name: 'Audit', route: '/app/audit', icon: icon(Calendar), permission: PERMISSIONS.audit.read },
      { key: 'lesson-schedule', name: 'Schedule', route: '/app/lesson-schedule', icon: icon(Calendar), permission: PERMISSIONS.lessons.read },
    ],
  },
  {
    key: 'rentals',
    name: 'Rentals',
    items: [
      { key: 'rentals', name: 'Rentals', route: '/app/rentals', icon: icon(Guitar), permission: PERMISSIONS.rentals.read },
      { key: 'resources', name: 'Resources', route: '/app/resources', icon: icon(Archive), permission: PERMISSIONS.instruments.read },
    ],
  },
  {
    key: 'administration',
    name: 'Administration',
    items: [
      { key: 'users', name: 'Users', route: '/app/users', icon: icon(UsersThree), permission: PERMISSIONS.customers.read },
    ],
  },
])

export function normalizeNavigation(sections = [], permissions = []) {
  if (!Array.isArray(sections)) return []

  return sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items)
        ? section.items.filter((item) => !item.permission || permissions.includes(item.permission))
        : [],
    }))
    .filter((section) => section.items.length)
}
