const fs = require('node:fs')
const path = require('node:path')
const {
  getLayerViolations,
  getApplicationSecurityViolations,
  hasDirectPrismaAccess,
  getRouteViolations,
} = require('./architecture-rules.cjs')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [
  path.join(ROOT, 'apps'),
  path.join(ROOT, 'features'),
  path.join(ROOT, 'modules'),
]

const LEGACY_APPOINTMENT_ROUTE = 'apps/api/src/features/appointments/appointment.routes.js'
const GLOBAL_ROUTES = 'apps/api/src/routes/index.js'
const APPLICATION_APPOINTMENT_ROUTE = /^apps\/api\/src\/apps\/[^/]+\/appointments\/[^/]+\.routes\.js$/
const APPOINTMENT_FEATURE_ROOT = 'apps/api/src/features/appointments/'

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(ROOT).filter((file) => /\.(js|cjs|mjs)$/.test(file))
const failures = []
const relativeFiles = new Set(
  files.map((file) => path.relative(process.cwd(), file).replaceAll(path.sep, '/'))
)

const getAppointmentArchitectureViolations = (relative, source) => {
  const violations = []

  if (relative === LEGACY_APPOINTMENT_ROUTE) {
    violations.push(
      `${relative}: appointment HTTP routes must be application-owned under apps/api/src/apps/*/appointments/.`
    )
  }

  if (
    relative === GLOBAL_ROUTES &&
    /(?:features\/appointments\/appointment\.routes|['"`]\/appointments['"`])/.test(source)
  ) {
    violations.push(
      `${relative}: global /appointments registration is forbidden; mount appointments through an application-owned router.`
    )
  }

  if (
    relative.startsWith(APPOINTMENT_FEATURE_ROOT) &&
    /(?:\.\.\/)+platform\/authorization\//.test(source)
  ) {
    violations.push(
      `${relative}: shared appointments must not depend on application authorization; authorization belongs to the owning application route.`
    )
  }

  if (
    relative.startsWith(APPOINTMENT_FEATURE_ROOT) &&
    /(?:\.\.\/)+apps\//.test(source)
  ) {
    violations.push(
      `${relative}: shared appointments must not import application code; application composition belongs in apps/.`
    )
  }

  if (
    relative.includes('/appointments/') &&
    relative.endsWith('.routes.js') &&
    relative.startsWith('apps/api/src/') &&
    !APPLICATION_APPOINTMENT_ROUTE.test(relative)
  ) {
    violations.push(
      `${relative}: appointment routes must live under apps/api/src/apps/<application>/appointments/.`
    )
  }

  return violations
}

if (relativeFiles.has(LEGACY_APPOINTMENT_ROUTE)) {
  failures.push(
    `${LEGACY_APPOINTMENT_ROUTE}: legacy global appointment route file must be removed.`
  )
}

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/')

  failures.push(...getLayerViolations(relative, source))
  failures.push(...getApplicationSecurityViolations(relative, source))
  failures.push(...getAppointmentArchitectureViolations(relative, source))

  const isApplicationService =
    (relative.startsWith('apps/api/src/features/') ||
      relative.startsWith('apps/api/src/apps/')) &&
    /(?:^|\/)\w+\.service\.(?:js|cjs|mjs)$/.test(relative)

  if (isApplicationService && hasDirectPrismaAccess(source)) {
    failures.push(
      `${relative}: services must not access Prisma directly; use a repository.`
    )
  }
}

for (const routeRoot of ROUTE_ROOTS) {
  for (const file of walk(routeRoot).filter((entry) =>
    entry.endsWith('.routes.js')
  )) {
    const source = fs.readFileSync(file, 'utf8')
    const relative = path
      .relative(process.cwd(), file)
      .replaceAll(path.sep, '/')
    failures.push(...getRouteViolations(relative, source))
  }
}

if (failures.length) {
  console.error('Architecture enforcement failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Architecture enforcement passed.')
