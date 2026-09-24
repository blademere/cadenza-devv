import { seedPlatform } from './platform.js'
import { seedObo } from './apps/obo.js'
import { seedCadenza } from './apps/cadenza.js'
import { seedModelCoverage } from '../seed-model-coverage.js'

const PROFILES = new Set(['default', 'development', 'fixtures', 'coverage'])
const APPS = new Set(['platform', 'obo', 'cadenza', 'all', 'coverage'])

async function runSeed(prisma, profile = 'default', app = 'platform') {
  if (!PROFILES.has(profile)) {
    throw new Error(`Unknown seed profile '${profile}'. Expected one of: ${[...PROFILES].join(', ')}.`)
  }
  if (!APPS.has(app)) {
    throw new Error(`Unknown seed app '${app}'. Expected one of: ${[...APPS].join(', ')}.`)
  }

  if (app === 'coverage') {
    await seedModelCoverage(prisma)
    console.log(`Seed complete (${profile}, coverage).`)
    return { applications: {}, roles: {}, permissionRecords: new Map() }
  }

  const context = { applications: {}, roles: {}, permissionRecords: new Map() }

  if (app === 'platform' || app === 'all') {
    const platform = await seedPlatform(prisma)
    for (const [key, permission] of platform.permissionRecords) context.permissionRecords.set(key, permission)
  }

  if (app === 'obo' || app === 'all') {
    const obo = await seedObo(prisma, { profile })
    context.applications.obo = obo.application
    Object.assign(context.roles, obo.roles)
    for (const [key, permission] of obo.permissionRecords) context.permissionRecords.set(key, permission)
  }

  if (app === 'cadenza' || app === 'all') {
    const cadenza = await seedCadenza(prisma, { profile })
    context.applications.cadenza = cadenza.application
    Object.assign(context.roles, cadenza.roles)
    for (const [key, permission] of cadenza.permissionRecords) context.permissionRecords.set(key, permission)
  }

  console.log(`Seed complete (${profile}, ${app}): ${context.permissionRecords.size} permissions, ${Object.keys(context.applications).length} application(s).`)
  return context
}

export { PROFILES, APPS, runSeed }
