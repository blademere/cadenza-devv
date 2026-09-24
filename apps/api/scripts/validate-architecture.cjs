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
const LEGACY_USER_ROUTE_FILES = new Set([
  'apps/api/src/features/users/user.routes.js',
  'apps/api/src/features/users/user.controller.js',
])
const USER_FEATURE_ROOT = 'apps/api/src/features/users/'
const APPLICATION_USER_ROUTE = /^apps\/api\/src\/apps\/[^/]+\/users\/[^/]+\.routes\.js$/

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

const getUserArchitectureViolations = (relative, source) => {
  const violations = []

  if (LEGACY_USER_ROUTE_FILES.has(relative)) {
    violations.push(
      `${relative}: user HTTP routes/controllers must be application-owned; shared features/users must remain routeless.`
    )
  }

  if (
    relative.startsWith(USER_FEATURE_ROOT) &&
    (relative.endsWith('.routes.js') || relative.endsWith('.controller.js'))
  ) {
    violations.push(
      `${relative}: user HTTP layers are forbidden under features/users; put application-owned routes/controllers under apps/<application>/users/.`
    )
  }

  if (
    relative.includes('/users/') &&
    relative.endsWith('.routes.js') &&
    relative.startsWith('apps/api/src/') &&
    !APPLICATION_USER_ROUTE.test(relative)
  ) {
    violations.push(
      `${relative}: user management routes must live under apps/api/src/apps/<application>/users/.`
    )
  }

  if (
    relative === GLOBAL_ROUTES &&
    /(?:features\/users\/(?:user\.)?(?:routes|controller)|['"`]\/users['"`]\s*,\s*userRouter)/.test(
      source
    )
  ) {
    violations.push(
      `${relative}: global user-management registration is forbidden; mount management routes through an application-owned router.`
    )
  }

  if (
    relative.startsWith(USER_FEATURE_ROOT) &&
    /(?:\.\.\/)+platform\/applications\//.test(source)
  ) {
    violations.push(
      `${relative}: shared users must not orchestrate application membership or roles; application-owned user services must compose platform applications.`
    )
  }

  if (
    relative.startsWith(USER_FEATURE_ROOT) &&
    /(?:\.\.\/)+platform\/authorization\//.test(source)
  ) {
    violations.push(
      `${relative}: shared users must not depend on application authorization; authorization belongs to the owning application route/service.`
    )
  }

  if (/(?:\b(?:user|users)\.)roleId\b/.test(source)) {
    violations.push(
      `${relative}: user-level roleId access is forbidden; roles must be resolved through AppMembershipRole.`
    )
  }

  return violations
}

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
  failures.push(...getUserArchitectureViolations(relative, source))

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
