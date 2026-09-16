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

// The OBO development fixtures predate the app-scoped domain model. Adapt
// legacy fixture writes at the seed boundary while the fixtures themselves are
// migrated incrementally. Production services do not use this proxy.
const prisma = new Proxy(basePrisma, {
  get(target, property) {
    if (property === 'user') {
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
              const membership = await target.appMembership.upsert({ where: { appId_userId: { appId: app.id, userId: user.id } }, update: { isActive: true }, create: { appId: app.id, userId: user.id } })
              await target.appMembershipRole.upsert({ where: { membershipId_roleId: { membershipId: membership.id, roleId } }, update: {}, create: { membershipId: membership.id, roleId } })
            }
            return user
          }
        },
      })
    }

    if (!['oboPermitType', 'oboProfessional', 'oboPermitApplication'].includes(property)) return target[property]

    const delegate = target[property]
    return new Proxy(delegate, {
      get(model, method) {
        if (!['create', 'upsert'].includes(method)) return typeof model[method] === 'function' ? model[method].bind(model) : model[method]
        return async (args = {}) => {
          const app = await target.app.findUnique({ where: { key: 'obo' } })
          if (!app) throw new Error("Application 'obo' must be seeded before OBO domain fixtures.")
          const create = args.create ? { ...args.create, appId: args.create.appId ?? app.id } : args.create
          const update = args.update ? { ...args.update } : args.update
          const data = args.data ? { ...args.data, appId: args.data.appId ?? app.id } : args.data
          return model[method]({ ...args, ...(args.create ? { create } : {}), ...(args.update ? { update } : {}), ...(args.data ? { data } : {}) })
        }
      },
    })
  },
})

async function seed() {
  const applications = await seedApplications(prisma)
  const { roles, permissionRecords } = await seedAuthorization(prisma, { applications })
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

  console.log(`Seed complete: ${permissionRecords.size} canonical permissions, application-owned roles, ${Object.keys(applications).length} platform application(s), application-scoped memberships and roles, platform OBO form/document/appointment configuration, OBO reference/workflow/notification fixtures, deterministic OBO development scenario with form-owned professional selection, deterministic professional verification cases, person profiles for active users, and verified complete Prisma model coverage.`)
}

async function main() {
  await seed()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
