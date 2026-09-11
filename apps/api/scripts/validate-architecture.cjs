const fs = require('node:fs')
const path = require('node:path')
const {
  getLayerViolations,
  isApplicationService: isApplicationServiceFile,
  hasDirectPrismaAccess,
} = require('./architecture-rules.cjs')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTES = path.join(ROOT, 'features')
const MUTATION = /router\.(post|put|patch|delete)\s*\(/g
const RESOURCE_ROUTE = /router\.(get|post|patch|delete)\s*\(\s*['"`]([^'"`]*\/:[^'"`]*)['"`]/g
const IDEMPOTENCY_MIDDLEWARE = /\b(?:requireIdempotency|idempotency(?:Middleware)?)\b/

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

  const isApplicationService =
    (relative.startsWith('apps/api/src/features/') || relative.startsWith('apps/api/src/modules/')) &&
    /(?:^|\/)\w+\.service\.(?:js|cjs|mjs)$/.test(relative)

  if (isApplicationService && hasDirectPrismaAccess(source)) {
    failures.push(`${relative}: services must not access Prisma directly; use a repository.`)
  }
}

for (const file of walk(ROUTES).filter((entry) => entry.endsWith('.routes.js'))) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/')

  for (const match of source.matchAll(MUTATION)) {
    const operationStart = match.index
    const lineStart = source.lastIndexOf('\n', operationStart) + 1
    const lineEnd = source.indexOf('\n', operationStart)
    const statement = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
    const context = source.slice(Math.max(0, operationStart - 400), lineEnd === -1 ? source.length : lineEnd)
    const explicitlyExempt = /idempotency\s*:\s*exempt/i.test(context)
    if (!IDEMPOTENCY_MIDDLEWARE.test(statement) && !explicitlyExempt) {
      failures.push(`${relative}: ${match[1].toUpperCase()} mutation must use shared idempotency middleware or an explicit 'idempotency: exempt' comment with justification.`)
    }
  }

  for (const match of source.matchAll(RESOURCE_ROUTE)) {
    const operationStart = match.index
    const lineStart = source.lastIndexOf('\n', operationStart) + 1
    const lineEnd = source.indexOf('\n', operationStart)
    const statement = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
    if (!/\bauthorizeResource\b|\bauthorize[A-Z][A-Za-z0-9_]*\b/.test(statement)) {
      failures.push(`${relative}: resource route '${match[2]}' must use authorizeResource or an explicit resource-authorization helper.`)
    }
  }
}

if (failures.length) {
  console.error('Architecture enforcement failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log('Architecture enforcement passed.')
