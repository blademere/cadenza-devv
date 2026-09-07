#!/usr/bin/env node

import 'dotenv/config'
import { seedModelCoverage } from './seed-model-coverage.js'
import { seedAuthorization } from './seed/authorization.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from './seed/obo.js'
import { seedOboNotifications } from './seed/notifications.js'
import { seedOboReferenceData } from './seed/obo-reference.js'
import { seedDevelopmentUsers } from './seed/development-users.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

async function seed() {
  const { roles, permissionRecords } = await seedAuthorization(prisma)

  await seedOboReferenceData(prisma)
  await seedOboDevelopmentScenario(prisma, { roles, passwordHash: process.env.SEED_DEMO_PASSWORD ? undefined : null })
  await verifyOboDevelopmentScenario(prisma)
  await seedOboNotifications(prisma)
  await seedDevelopmentUsers(prisma, { roles })
  await seedModelCoverage(prisma)

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, baseline roles, OBO reference/workflow/notification fixtures, deterministic OBO development scenario, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
