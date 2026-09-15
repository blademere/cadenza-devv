const fs = require('node:fs')
const path = require('node:path')
const {
  getLayerViolations,
  getApplicationSecurityViolations,
  hasDirectPrismaAccess,
  getRouteViolations,
} = require('./architecture-rules.cjs')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [path.join(ROOT, 'features'), path.join(ROOT, 'modules')]

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(ROOT).filter((file) => /\.(js|cjs|mjs)$/.test(file))
const failures = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/')

  failures.push(...getLayerViolations(relative, source))
  failures.push(...getApplicationSecurityViolations(relative, source))

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
