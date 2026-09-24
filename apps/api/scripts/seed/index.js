import { seedPlatform } from './platform.js'
import { seedObo } from './apps/obo.js'
import { seedCadenza } from './apps/cadenza.js'
import { seedModelCoverage } from '../seed-model-coverage.js'

const PROFILES = new Set(['default', 'development', 'fixtures', 'coverage'])
const APPS = new Set(['platform', 'all', 'obo', 'cadenza'])

async function runSeed(prisma, profile = 'default', app = 'all') {
  if (!PROFILES.has(profile)) {
    throw new Error(`Unknown seed profile '${profile}'. Expected one of: ${[...PROFILES].join(', ')}.`)
  }
  if (!APPS.has(app)) {
    throw new Error(`Unknown seed app '${app}'. Expected one of: ${[...APPS].join(', ')}.`)
  }

  const applications = await seedPlatform(prisma)
  const context = { applications, roles: {}, permissionRecords: new Map() }

  if (app === 'all' || app === 'obo') {
    const obo = await seedObo(prisma, { profile })
    Object.assign(context.roles, obo.roles)
    for (const [key, permission] of obo.permissionRecords) context.permissionRecords.set(key, permission)
  }

  if (app === 'all' || app === 'cadenza') {
    const cadenza = await seedCadenza(prisma, { profile })
    Object.assign(context.roles, cadenza.roles)
    for (const [key, permission] of cadenza.permissionRecords) context.permissionRecords.set(key, permission)
  }

  if (profile === 'coverage') await seedModelCoverage(prisma)

  console.log(`Seed complete (${profile}, ${app}): ${context.permissionRecords.size} permissions, ${Object.keys(applications).length} application(s).`)
  return context
}

export { PROFILES, APPS, runSeed }
