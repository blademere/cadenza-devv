import { seedAuthorization } from './authorization.js'
import { seedApplications } from './applications.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from './obo-development.js'
import { seedOboNotifications } from './notifications.js'
import { seedOboReferenceData } from './obo-reference.js'
import { seedPlatformForms } from './platform-forms.js'
import { seedOboPlatformConfiguration, verifyOboPlatformConfiguration } from './obo-platform-configuration.js'
import { bindOboDevelopmentForm } from './obo-form-bindings.js'
import { seedDevelopmentUsers } from './development-users.js'
import { seedRolePersons } from './people.js'
import { seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures } from './obo-professional-verification.js'
import { seedModelCoverage } from '../seed-model-coverage.js'

const PROFILES = new Set(['default', 'development', 'fixtures', 'coverage'])

async function seedCore(prisma) {
  const applications = await seedApplications(prisma)
  const { roles, permissionRecords } = await seedAuthorization(prisma, { applications })
  const { form: planPermitForm } = await seedPlatformForms(prisma)
  await seedOboReferenceData(prisma, { planPermitForm })

  return { applications, roles, permissionRecords }
}

async function seedDevelopment(prisma, context) {
  const { roles } = context
  const { demoPasswordHash } = await seedDevelopmentUsers(prisma, { roles })
  await seedOboDevelopmentScenario(prisma, { roles, passwordHash: demoPasswordHash })
  await seedOboPlatformConfiguration(prisma)
  await bindOboDevelopmentForm(prisma)
  await seedRolePersons(prisma)
  await verifyOboPlatformConfiguration(prisma)
  await verifyOboDevelopmentScenario(prisma)
}

async function seedFixtures(prisma, context) {
  const { roles } = context
  await seedOboProfessionalVerificationFixtures(prisma, { roles, passwordHash: null })
  await seedOboNotifications(prisma)
  await verifyOboProfessionalVerificationFixtures(prisma)
}

async function seedCoverage(prisma) {
  await seedModelCoverage(prisma)
}

async function runSeed(prisma, profile = 'default') {
  if (!PROFILES.has(profile)) {
    throw new Error(`Unknown seed profile '${profile}'. Expected one of: ${[...PROFILES].join(', ')}.`)
  }

  const context = await seedCore(prisma)

  if (profile === 'development') await seedDevelopment(prisma, context)
  if (profile === 'fixtures') await seedFixtures(prisma, context)
  if (profile === 'coverage') await seedCoverage(prisma)

  const profileDescription = {
    default: 'required application, authorization, platform form, and OBO reference data',
    development: 'required data plus deterministic OBO development users, scenario, platform configuration, form binding, and person profiles',
    fixtures: 'required data plus professional-verification and notification fixtures',
    coverage: 'required data plus complete Prisma model coverage',
  }[profile]

  console.log(`Seed complete (${profile}): ${context.permissionRecords.size} canonical permissions, ${Object.keys(context.applications).length} application(s), ${profileDescription}.`)
  return context
}

export { PROFILES, runSeed, seedCore, seedDevelopment, seedFixtures, seedCoverage }
