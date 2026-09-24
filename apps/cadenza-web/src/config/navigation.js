import { createElement } from 'react'
import { Archive, Calendar, ClockCounterClockwise, Guitar, House, MusicNotes, UsersThree } from '@phosphor-icons/react'
import { PERMISSIONS } from './permissions'

const icon = (I) => () => createElement(I, { size: 20, weight: 'regular', 'aria-hidden': true })

export const navigation = Object.freeze([
  { key: 'workspace', name: 'Workspace', items: [{ key: 'dashboard', name: 'Dashboard', route: '/app/dashboard', icon: icon(House), permission: PERMISSIONS.dashboard.read }] },
  {
    key: 'customer',
    name: 'Customer',
    items: [
      { key: 'lessons', name: 'Lessons', icon: icon(MusicNotes), children: [
        { key: 'find-lessons', name: 'Find Lessons', route: '/app/find-lessons', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.enrollments.create] },
        { key: 'my-lessons', name: 'My Lessons', route: '/app/my-lessons', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.enrollments.read] },
        { key: 'lesson-history', name: 'Lesson History', route: '/app/lesson-history', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.enrollments.read] },
      ] },
      { key: 'rentals', name: 'Rentals', icon: icon(Guitar), children: [
        { key: 'find-rentals', name: 'Find Rentals', route: '/app/find-rentals', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.rentals.create] },
        { key: 'my-rentals', name: 'My Rentals', route: '/app/my-rentals', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.rentals.read] },
        { key: 'rental-history', name: 'Rental History', route: '/app/rental-history', allPermissions: [PERMISSIONS.portals.customer, PERMISSIONS.rentals.read] },
      ] },
    ],
  },
  { key: 'instructor', name: 'Instructor', items: [{ key: 'my-teaching', name: 'My Teaching', route: '/app/my-teaching', icon: icon(MusicNotes), allPermissions: [PERMISSIONS.portals.instructor, PERMISSIONS.lessons.attendance] }] },
  {
    key: 'lessons-management', name: 'Lesson Management', items: [
      { key: 'lesson-packages', name: 'Packages', route: '/app/lesson-packages', icon: icon(MusicNotes), anyPermissions: [PERMISSIONS.lessons.create, PERMISSIONS.lessons.manage] },
      { key: 'lesson-enrollments', name: 'Enrollments', route: '/app/lesson-enrollments', icon: icon(UsersThree), permission: PERMISSIONS.enrollments.manage },
      { key: 'lesson-schedule', name: 'Schedule & Sessions', route: '/app/lesson-schedule', icon: icon(Calendar), anyPermissions: [PERMISSIONS.lessons.schedule, PERMISSIONS.lessons.manage] },
    ],
  },
  {
    key: 'rentals-management', name: 'Rental Management', items: [
      { key: 'rental-management', name: 'Rental Operations', route: '/app/rentals', icon: icon(Guitar), permission: PERMISSIONS.rentals.manage },
    ],
  },
  {
    key: 'resources', name: 'Resources', items: [
      { key: 'resource-center', name: 'Resource Center', route: '/app/resources', icon: icon(Archive), anyPermissions: [PERMISSIONS.instruments.create, PERMISSIONS.instruments.update, PERMISSIONS.instruments.manage, PERMISSIONS.rooms.create, PERMISSIONS.rooms.update, PERMISSIONS.rooms.manage] },
      { key: 'resource-usage', name: 'Usage History', route: '/app/resources/usage-history', icon: icon(ClockCounterClockwise), permission: PERMISSIONS.rentals.manage },
    ],
  },
  { key: 'administration', name: 'Administration', items: [
    { key: 'users', name: 'Users', route: '/app/users', icon: icon(UsersThree), anyPermissions: [PERMISSIONS.customers.manage, PERMISSIONS.staff.manage, PERMISSIONS.instructors.manage] },
    { key: 'audit', name: 'Audit Trail', route: '/app/audit', icon: icon(ClockCounterClockwise), permission: PERMISSIONS.audit.read },
  ] },
])

export function normalizeNavigation(sections = [], permissions = []) {
  if (!Array.isArray(sections)) return []
  return sections
    .map((section) => ({
      ...section,
      items: Array.isArray(section.items)
        ? section.items
            .filter((item) => !item.permission || permissions.includes(item.permission))
            .filter((item) => !item.anyPermissions || item.anyPermissions.some((permission) => permissions.includes(permission)))
            .filter((item) => !item.allPermissions || item.allPermissions.every((permission) => permissions.includes(permission)))
            .map((item) => ({
              ...item,
              children: Array.isArray(item.children)
                ? item.children
                    .filter((child) => !child.permission || permissions.includes(child.permission))
                    .filter((child) => !child.anyPermissions || child.anyPermissions.some((permission) => permissions.includes(permission)))
                    .filter((child) => !child.allPermissions || child.allPermissions.every((permission) => permissions.includes(permission)))
                : undefined,
            }))
            .filter((item) => !Array.isArray(item.children) || item.children.length > 0)
        : [],
    }))
    .filter((section) => section.items.length)
}
