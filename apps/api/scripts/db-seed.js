#!/usr/bin/env node

import 'dotenv/config'
import bcrypt from 'bcrypt'
import { seedModelCoverage } from './seed-model-coverage.js'
import { seedAuthorization } from './seed/authorization.js'
import { seedOboDevelopmentScenario } from './seed/obo.js'
import { seedOboNotifications } from './seed/notifications.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

async function seedDevelopmentAdmin(roles) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.log('No development admin configured; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.')
    return null
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({ where: { email: adminEmail }, update: { roleId: roles.admin.id, isActive: true }, create: { email: adminEmail, passwordHash, roleId: roles.admin.id, isActive: true } })
  console.log(`Development admin ensured: ${adminEmail}`)
  return admin
}

async function seed() {
  const { roles, permissionRecords } = await seedAuthorization(prisma)
  const demoPasswordHash = process.env.SEED_DEMO_PASSWORD ? await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12) : null

  await prisma.oboPermitType.upsert({ where: { key: 'building-plan-permit' }, update: { name: 'Building Plan Permit', isActive: true }, create: { key: 'building-plan-permit', name: 'Building Plan Permit', description: 'Plan permit application for building construction and related work.' } })
  await prisma.appointmentType.upsert({ where: { key: 'obo-hardcopy-submission' }, update: { name: 'OBO Hardcopy Submission', isActive: true }, create: { key: 'obo-hardcopy-submission', name: 'OBO Hardcopy Submission', description: 'Physical hardcopy submission appointment for an OBO permit application.', defaultDurationMinutes: 30, defaultCapacity: 1 } })
  await seedOboDevelopmentScenario(prisma, { roles, passwordHash: demoPasswordHash })
  await seedOboNotifications(prisma)
  await seedDevelopmentAdmin(roles)
  await seedModelCoverage(prisma)

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, baseline roles, OBO reference/workflow/notification fixtures, deterministic OBO development scenario, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
