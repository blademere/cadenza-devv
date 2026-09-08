#!/usr/bin/env node

import 'dotenv/config'
import { seedModelCoverage } from './seed-model-coverage.js'
import { seedAuthorization } from './seed/authorization.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from './seed/obo.js'
import { seedOboNotifications } from './seed/notifications.js'
import { seedOboReferenceData } from './seed/obo-reference.js'
import { seedPlatformForms } from './seed/platform-forms.js'
import { seedOboPlatformConfiguration, verifyOboPlatformConfiguration } from './seed/obo-platform-configuration.js'
import { bindOboDevelopmentForm } from './seed/obo-form-bindings.js'
import { seedDevelopmentUsers } from './seed/development-users.js'
import { seedRolePersons } from './seed/people.js'
import { seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures } from './seed/obo-professional-verification.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const prisma = getPrismaClient()

async function seed() {
  const { roles, permissionRecords } = await seedAuthorization(prisma)
  const { demoPasswordHash } = await seedDevelopmentUsers(prisma, { roles })
  const { form: planPermitForm } = await seedPlatformForms(prisma)

  await seedOboReferenceData(prisma, { planPermitForm })
  await seedOboPlatformConfiguration(prisma)
  await seedOboDevelopmentScenario(prisma, { roles, passwordHash: demoPasswordHash })
  await seedOboProfessionalVerificationFixtures(prisma, { roles, passwordHash: demoPasswordHash })
  await seedRolePersons(prisma)
  await bindOboDevelopmentForm(prisma)
  await verifyOboPlatformConfiguration(prisma)
  await verifyOboDevelopmentScenario(prisma)
  await verifyOboProfessionalVerificationFixtures(prisma)
  await seedOboNotifications(prisma)
  await seedModelCoverage(prisma)

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, baseline roles, platform OBO form/document/appointment configuration, OBO reference/workflow/notification fixtures, deterministic OBO development scenario, deterministic professional verification cases, person profiles for active users, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
