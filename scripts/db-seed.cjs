#!/usr/bin/env node

require('dotenv').config()
const bcrypt = require('bcrypt')
const { getPrismaClient, disconnectPrisma } = require('../src/infrastructure/database/prisma')
const {
  ACCESS_CONTROL_MODULE_DEFINITIONS,
  getPermissionDefinitions,
} = require('../src/platform/authorization/access-control.registry')

const prisma = getPrismaClient()

const rolePermissions = {
  client: [
    'applications:read',
    'applications:create',
    'applications:update',
    'appointments:read',
    'appointments:create',
    'appointments:cancel',
  ],
  professional: [
    'applications:read',
    'applications:create',
    'applications:update',
    'professionals:create',
    'professionals:read',
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
  ],
}

async function seed() {
  const moduleRecords = new Map()

  for (const definition of ACCESS_CONTROL_MODULE_DEFINITIONS) {
    moduleRecords.set(
      definition.key,
      await prisma.module.upsert({
        where: { key: definition.key },
        update: {
          name: definition.name,
          description: definition.description,
        },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
        },
      }),
    )
  }

  const permissionRecords = new Map()

  for (const definition of getPermissionDefinitions()) {
    const module = moduleRecords.get(definition.moduleKey)
    const permission = await prisma.permission.upsert({
      where: {
        moduleId_action: {
          moduleId: module.id,
          action: definition.action,
        },
      },
      update: {},
      create: {
        moduleId: module.id,
        action: definition.action,
      },
    })

    permissionRecords.set(definition.key, permission)
  }

  const roles = {
    client: await prisma.role.upsert({
      where: { name: 'client' },
      update: {
        description: 'Client who creates permit applications and schedules hardcopy submission appointments.',
      },
      create: {
        name: 'client',
        description: 'Client who creates permit applications and schedules hardcopy submission appointments.',
      },
    }),
    professional: await prisma.role.upsert({
      where: { name: 'professional' },
      update: {
        description: 'Registered professional who applies for verification and is associated with permit applications.',
      },
      create: {
        name: 'professional',
        description: 'Registered professional who applies for verification and is associated with permit applications.',
      },
    }),
    receiving_officer: await prisma.role.upsert({
      where: { name: 'receiving_officer' },
      update: {
        description: 'Receiving officer who verifies professionals and receives permit applications.',
      },
      create: {
        name: 'receiving_officer',
        description: 'Receiving officer who verifies professionals and receives permit applications.',
      },
    }),
    admin: await prisma.role.upsert({
      where: { name: 'admin' },
      update: {
        description: 'Development administrator with all foundation permissions.',
      },
      create: {
        name: 'admin',
        description: 'Development administrator with all foundation permissions.',
      },
    }),
  }

  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    for (const key of keys) {
      const permission = permissionRecords.get(key)
      if (!permission) {
        throw new Error(`Unknown permission declared for ${roleName}: ${key}`)
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[roleName].id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: roles[roleName].id,
          permissionId: permission.id,
        },
      })
    }
  }

  for (const permission of permissionRecords.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles.admin.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: roles.admin.id,
        permissionId: permission.id,
      },
    })
  }

  await prisma.oboPermitType.upsert({
    where: { key: 'building-plan-permit' },
    update: {
      name: 'Building Plan Permit',
      isActive: true,
    },
    create: {
      key: 'building-plan-permit',
      name: 'Building Plan Permit',
      description: 'Plan permit application for building construction and related work.',
    },
  })

  await prisma.appointmentType.upsert({
    where: { key: 'obo-hardcopy-submission' },
    update: {
      name: 'OBO Hardcopy Submission',
      isActive: true,
    },
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
      update: {
        roleId: roles.admin.id,
        isActive: true,
      },
      create: {
        email: adminEmail,
        passwordHash,
        roleId: roles.admin.id,
        isActive: true,
      },
    })
    console.log(`Development admin ensured: ${adminEmail}`)
  } else {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
  }

  console.log(
    `Seeded ${ACCESS_CONTROL_MODULE_DEFINITIONS.length} modules, ${permissionRecords.size} permissions, OBO plan permit type, appointment type, and application roles.`,
  )
}

seed()
  .catch((error) => {
    console.error(`Database seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
