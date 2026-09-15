#!/usr/bin/env node

import 'dotenv/config'
import { seedModelCoverage } from './seed-model-coverage.js'
import { seedAuthorization } from './seed/authorization.js'
import { seedApplications } from './seed/applications.js'
import { seedOboDevelopmentScenario, verifyOboDevelopmentScenario } from './seed/obo-development.js'
import { seedOboNotifications } from './seed/notifications.js'
import { seedOboReferenceData } from './seed/obo-reference.js'
import { seedPlatformForms } from './seed/platform-forms.js'
import { seedOboPlatformConfiguration, verifyOboPlatformConfiguration } from './seed/obo-platform-configuration.js'
import { bindOboDevelopmentForm } from './seed/obo-form-bindings.js'
import { seedDevelopmentUsers } from './seed/development-users.js'
import { seedRolePersons } from './seed/people.js'
import { seedOboProfessionalVerificationFixtures, verifyOboProfessionalVerificationFixtures } from './seed/obo-professional-verification.js'
import { getPrismaClient, disconnectPrisma } from '../src/infrastructure/database/prisma.js'

const basePrisma = getPrismaClient()

// The OBO development fixture predates the app-scoped role model and still
// passes roleId to its local ensureUser helper. Adapt that fixture input at the
// seed boundary so the database never receives a global User.roleId write.
const prisma = new Proxy(basePrisma, {
  get(target, property) {
    if (property !== 'user') return target[property]
    return new Proxy(target.user, {
      get(delegate, method) {
        if (method !== 'upsert') return delegate[method].bind(delegate)
        return async (args) => {
          const roleId = args.create?.roleId ?? args.update?.roleId
          const create = { ...args.create }
          const update = { ...args.update }
          delete create.roleId
          delete update.roleId
          const user = await delegate.upsert({ ...args, create, update })
          if (roleId != null) {
            const app = await target.app.findUnique({ where: { key: 'obo' } })
            if (!app) throw new Error("Application 'obo' must be seeded before OBO role fixtures.")
            const membership = await target.appMembership.upsert({
              where: { appId_userId: { appId: app.id, userId: user.id } },
              update: { isActive: true },
              create: { appId: app.id, userId: user.id },
            })
            await target.appMembershipRole.upsert({
              where: { membershipId_roleId: { membershipId: membership.id, roleId } },
              update: {},
              create: { membershipId: membership.id, roleId },
            })
          }
          return user
        }
      },
    })
  },
})

async function seed() {
  const { roles, permissionRecords } = await seedAuthorization(prisma)
  const applications = await seedApplications(prisma)
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

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, baseline roles, ${Object.keys(applications).length} platform application(s), application-scoped memberships and roles, platform OBO form/document/appointment configuration, OBO reference/workflow/notification fixtures, deterministic OBO development scenario with form-owned professional selection, deterministic professional verification cases, person profiles for active users, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main().catch((error) => { console.error(`Database seed failed: ${error.message}`); process.exitCode = 1 }).finally(async () => { await disconnectPrisma() })
