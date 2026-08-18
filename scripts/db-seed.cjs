#!/usr/bin/env node

require('dotenv').config()

const bcrypt = require('bcrypt')
const { getPrismaClient, disconnectPrisma } = require('../src/infrastructure/database/prisma')

const prisma = getPrismaClient()

const modules = [
  ['users', 'Users'], ['applications', 'Applications'], ['documents', 'Documents'],
  ['inspections', 'Inspections'], ['reports', 'Reports'], ['appointments', 'Appointments'],
  ['notifications', 'Notifications'], ['audit_logs', 'Audit Logs'],
]

const permissions = [
  ['users', 'read'], ['users', 'create'], ['users', 'update'], ['users', 'delete'],
  ['applications', 'read'], ['applications', 'create'], ['applications', 'update'], ['applications', 'delete'],
  ['applications', 'review'], ['applications', 'receive'], ['applications', 'approve'], ['applications', 'reject'],
  ['documents', 'read'], ['documents', 'upload'], ['documents', 'delete'],
  ['inspections', 'read'], ['inspections', 'create'], ['inspections', 'update'], ['reports', 'read'],
  ['appointments', 'read'], ['appointments', 'create'], ['appointments', 'update'], ['appointments', 'cancel'],
  ['appointments', 'check_in'], ['appointments', 'no_show'], ['appointments', 'manage'],
  ['notifications', 'read'], ['notifications', 'manage'],
  ['audit_logs', 'read'],
]

async function seed() {
  const moduleRecords = new Map()
  for (const [key, name] of modules) {
    const record = await prisma.module.upsert({ where: { key }, update: { name }, create: { key, name } })
    moduleRecords.set(key, record)
  }

  const permissionRecords = []
  for (const [moduleKey, action] of permissions) {
    const module = moduleRecords.get(moduleKey)
    permissionRecords.push(await prisma.permission.upsert({
      where: { moduleId_action: { moduleId: module.id, action } },
      update: {},
      create: { moduleId: module.id, action },
    }))
  }

  await prisma.role.upsert({ where: { name: 'client' }, update: { description: 'Default authenticated application user.' }, create: { name: 'client', description: 'Default authenticated application user.' } })
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: { description: 'Development administrator with all foundation permissions.' }, create: { name: 'admin', description: 'Development administrator with all foundation permissions.' } })

  for (const permission of permissionRecords) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } }, update: {}, create: { roleId: adminRole.id, permissionId: permission.id } })
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.upsert({ where: { email: adminEmail }, update: { roleId: adminRole.id, isActive: true }, create: { email: adminEmail, passwordHash, roleId: adminRole.id, isActive: true } })
    console.log(`Development admin ensured: ${adminEmail}`)
  } else {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  }

  console.log(`Seeded ${modules.length} modules, ${permissionRecords.length} permissions, and the client/admin roles.`)
}

seed().catch((error) => {
  console.error(`Database seed failed: ${error.message}`)
  process.exitCode = 1
}).finally(async () => {
  await disconnectPrisma()
})
