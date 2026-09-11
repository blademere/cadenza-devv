const fs = require('node:fs')
const path = require('node:path')
const {
  getLayerViolations,
  hasDirectPrismaAccess,
} = require('./architecture-rules.cjs')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [
  path.join(ROOT, 'features'),
  path.join(ROOT, 'modules'),
]
const MUTATION = /router\.(post|put|patch|delete)\s*\(/g
const RESOURCE_ROUTE = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]*\/:[^'"`]*)['"`]/g
const IDEMPOTENCY_MIDDLEWARE = /\b(?:requireIdempotency|idempotency(?:Middleware)?)\b/
const AUTHORIZATION_MIDDLEWARE = /\bauthorizeResource\b|\bauthorize[A-Z][A-Za-z0-9_]*\b/

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const findCallEnd = (source, start) => {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }

    if (char === '(') {
      depth += 1
      continue
    }

    if (char === ')') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  return source.length
}

const getRouteViolations = (relative, source) => {
  const failures = []

  for (const match of source.matchAll(MUTATION)) {
    const operationStart = match.index
    const statementEnd = findCallEnd(source, operationStart)
    const statement = source.slice(operationStart, statementEnd)
    const contextStart = Math.max(0, operationStart - 400)
    const context = source.slice(contextStart, statementEnd)
    const explicitlyExempt = /idempotency\s*:\s*exempt/i.test(context)

    if (!IDEMPOTENCY_MIDDLEWARE.test(statement) && !explicitlyExempt) {
      failures.push(`${relative}: ${match[1].toUpperCase()} mutation must use shared idempotency middleware or an explicit 'idempotency: exempt' comment with justification.`)
    }
  }

  for (const match of source.matchAll(RESOURCE_ROUTE)) {
    const operationStart = match.index
    const statementEnd = findCallEnd(source, operationStart)
    const statement = source.slice(operationStart, statementEnd)

    if (!AUTHORIZATION_MIDDLEWARE.test(statement)) {
      failures.push(`${relative}: resource route '${match[2]}' must use authorizeResource or an explicit resource-authorization helper.`)
    }
  }

  return failures
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

for (const routeRoot of ROUTE_ROOTS) {
  for (const file of walk(routeRoot).filter((entry) => entry.endsWith('.routes.js'))) {
    const source = fs.readFileSync(file, 'utf8')
    const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/')
    failures.push(...getRouteViolations(relative, source))
  }
}

if (failures.length) {
  console.error('Architecture enforcement failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Architecture enforcement passed.')

module.exports = { findCallEnd, getRouteViolations }
