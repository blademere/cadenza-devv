#!/usr/bin/env node

require('dotenv').config()
const bcrypt = require('bcrypt')
const { getPrismaClient, disconnectPrisma } = require('../src/infrastructure/database/prisma')
const prisma = getPrismaClient()

const modules = [
  ['users', 'Users'], ['applications', 'Applications'], ['documents', 'Documents'], ['inspections', 'Inspections'], ['reports', 'Reports'], ['appointments', 'Appointments'], ['notifications', 'Notifications'], ['audit_logs', 'Audit Logs'],
]
const permissions = [
  ['users', 'read'], ['users', 'create'], ['users', 'update'], ['users', 'delete'],
  ['applications', 'read'], ['applications', 'create'], ['applications', 'update'], ['applications', 'delete'], ['applications', 'review'], ['applications', 'receive'], ['applications', 'approve'], ['applications', 'reject'],
  ['documents', 'read'], ['documents', 'upload'], ['documents', 'delete'], ['inspections', 'read'], ['inspections', 'create'], ['inspections', 'update'], ['reports', 'read'],
  ['appointments', 'read'], ['appointments', 'create'], ['appointments', 'update'], ['appointments', 'cancel'], ['appointments', 'check_in'], ['appointments', 'no_show'], ['appointments', 'manage'],
  ['notifications', 'read'], ['notifications', 'manage'], ['audit_logs', 'read'],
]
const rolePermissions = {
  client: ['applications:read', 'applications:create', 'applications:update', 'appointments:read', 'appointments:create', 'appointments:cancel'],
  professional: ['applications:read', 'applications:create', 'applications:update', 'applications:review'],
  receiving_officer: ['applications:read', 'applications:review', 'applications:receive', 'applications:approve', 'applications:reject', 'appointments:read', 'appointments:check_in', 'appointments:manage'],
}

async function seed() {
  const moduleRecords = new Map()
  for (const [key, name] of modules) {
    moduleRecords.set(key, await prisma.module.upsert({ where: { key }, update: { name }, create: { key, name } }))
  }
  const permissionRecords = new Map()
  for (const [moduleKey, action] of permissions) {
    const module = moduleRecords.get(moduleKey)
    const permission = await prisma.permission.upsert({ where: { moduleId_action: { moduleId: module.id, action } }, update: {}, create: { moduleId: module.id, action } })
    permissionRecords.set(`${moduleKey}:${action}`, permission)
  }
  const roles = {
    client: await prisma.role.upsert({ where: { name: 'client' }, update: { description: 'Client who creates permit applications and schedules hardcopy submission appointments.' }, create: { name: 'client', description: 'Client who creates permit applications and schedules hardcopy submission appointments.' } }),
    professional: await prisma.role.upsert({ where: { name: 'professional' }, update: { description: 'Registered professional who applies for verification and is associated with permit applications.' }, create: { name: 'professional', description: 'Registered professional who applies for verification and is associated with permit applications.' } }),
    receiving_officer: await prisma.role.upsert({ where: { name: 'receiving_officer' }, update: { description: 'Receiving officer who verifies professionals and receives permit applications.' }, create: { name: 'receiving_officer', description: 'Receiving officer who verifies professionals and receives permit applications.' } }),
    admin: await prisma.role.upsert({ where: { name: 'admin' }, update: { description: 'Development administrator with all foundation permissions.' }, create: { name: 'admin', description: 'Development administrator with all foundation permissions.' } }),
  }
  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    for (const key of keys) {
      const permission = permissionRecords.get(key)
      if (permission) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles[roleName].id, permissionId: permission.id } }, update: {}, create: { roleId: roles[roleName].id, permissionId: permission.id } })
    }
  }
  for (const permission of permissionRecords.values()) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles.admin.id, permissionId: permission.id } }, update: {}, create: { roleId: roles.admin.id, permissionId: permission.id } })
  }
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.upsert({ where: { email: adminEmail }, update: { roleId: roles.admin.id, isActive: true }, create: { email: adminEmail, passwordHash, roleId: roles.admin.id, isActive: true } })
    console.log(`Development admin ensured: ${adminEmail}`)
  } else console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  console.log(`Seeded ${modules.length} modules, ${permissionRecords.size} permissions, and client/professional/receiving_officer/admin roles.`)
}

seed().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
