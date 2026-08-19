#!/usr/bin/env node

require('dotenv').config()
const bcrypt = require('bcrypt')
const { getPrismaClient, disconnectPrisma } = require('../src/infrastructure/database/prisma')

const prisma = getPrismaClient()

const rolePermissions = {
  client: [
    'applications:read',
    'applications:create',
    'applications:update',
    'appointments:read',
    'appointments:create',
    'appointments:cancel',
    'obo_plan_permits:read',
    'obo_plan_permits:create',
    'obo_plan_permits:update',
    'obo_plan_permits:submit',
    'obo_plan_permits:schedule_submission',
    'obo_professionals:read',
  ],
  professional: [
    'applications:read',
    'applications:create',
    'applications:update',
    'appointments:read',
    'obo_plan_permits:read',
    'obo_professionals:create',
    'obo_professionals:read',
  ],
  receiving_officer: [
    'applications:read',
    'applications:review',
    'applications:receive',
    'applications:approve',
    'applications:reject',
    'professionals:read',
    'professionals:review',
    'appointments:read',
    'appointments:check_in',
    'appointments:manage',
    'obo_plan_permits:read',
    'obo_plan_permits:receive',
    'obo_professionals:read',
    'obo_professionals:review',
  ],
  admin: ['authorization:manage'],
}

const permissionKeys = [...new Set(Object.values(rolePermissions).flat())]
const moduleName = (key) => key.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

async function seed() {
  const moduleRecords = new Map()
  const permissionRecords = new Map()

  for (const permissionKey of permissionKeys) {
    const separatorIndex = permissionKey.indexOf(':')
    const moduleKey = permissionKey.slice(0, separatorIndex)
    const action = permissionKey.slice(separatorIndex + 1)
    if (!moduleKey || !action) throw new Error(`Invalid permission key: ${permissionKey}`)

    let module = moduleRecords.get(moduleKey)
    if (!module) {
      module = await prisma.module.upsert({
        where: { key: moduleKey },
        update: {},
        create: { key: moduleKey, name: moduleName(moduleKey) },
      })
      moduleRecords.set(moduleKey, module)
    }

    const permission = await prisma.permission.upsert({
      where: { moduleId_action: { moduleId: module.id, action } },
      update: {},
      create: { moduleId: module.id, action },
    })
    permissionRecords.set(permissionKey, permission)
  }

  const roles = {
    client: await prisma.role.upsert({
      where: { name: 'client' },
      update: { description: 'Client who creates permit applications and schedules hardcopy submission appointments.' },
      create: { name: 'client', description: 'Client who creates permit applications and schedules hardcopy submission appointments.' },
    }),
    professional: await prisma.role.upsert({
      where: { name: 'professional' },
      update: { description: 'Registered professional who applies for verification and is associated with permit applications.' },
      create: { name: 'professional', description: 'Registered professional who applies for verification and is associated with permit applications.' },
    }),
    receiving_officer: await prisma.role.upsert({
      where: { name: 'receiving_officer' },
      update: { description: 'Receiving officer who verifies professionals and receives permit applications.' },
      create: { name: 'receiving_officer', description: 'Receiving officer who verifies professionals and receives permit applications.' },
    }),
    admin: await prisma.role.upsert({
      where: { name: 'admin' },
      update: { description: 'Development administrator with authorization administration access.' },
      create: { name: 'admin', description: 'Development administrator with authorization administration access.' },
    }),
  }

  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    for (const key of keys) {
      const permission = permissionRecords.get(key)
      if (!permission) throw new Error(`Unknown permission declared for ${roleName}: ${key}`)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[roleName].id, permissionId: permission.id } },
        update: {},
        create: { roleId: roles[roleName].id, permissionId: permission.id },
      })
    }
  }

  for (const permission of permissionRecords.values()) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.admin.id, permissionId: permission.id } },
      update: {},
      create: { roleId: roles.admin.id, permissionId: permission.id },
    })
  }

  await prisma.oboPermitType.upsert({
    where: { key: 'building-plan-permit' },
    update: { name: 'Building Plan Permit', isActive: true },
    create: {
      key: 'building-plan-permit',
      name: 'Building Plan Permit',
      description: 'Plan permit application for building construction and related work.',
    },
  })

  await prisma.appointmentType.upsert({
    where: { key: 'obo-hardcopy-submission' },
    update: { name: 'OBO Hardcopy Submission', isActive: true },
    create: {
      key: 'obo-hardcopy-submission',
      name: 'OBO Hardcopy Submission',
      description: 'Physical hardcopy submission appointment for an OBO permit application.',
      defaultDurationMinutes: 30,
      defaultCapacity: 1,
    },
  })

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { roleId: roles.admin.id, isActive: true },
      create: { email: adminEmail, passwordHash, roleId: roles.admin.id, isActive: true },
    })
    console.log(`Development admin ensured: ${adminEmail}`)
  } else {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  }

  console.log(`Seeded ${moduleRecords.size} modules, ${permissionRecords.size} permissions, OBO plan permit type, appointment type, and application roles.`)
}

seed()
  .catch((error) => {
    console.error(`Database seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
