const path = require('node:path')

const FORBIDDEN_PLATFORM_IMPORT = /(?:\.\.\/)+(?:apps|features|modules)\//
const FORBIDDEN_FEATURE_IMPORT = /(?:\.\.\/)+modules\//
const FORBIDDEN_INFRASTRUCTURE_IMPORT = /(?:\.\.\/)+modules\//
const FORBIDDEN_COMMON_IMPORT = /(?:\.\.\/)+(?:features|platform|modules)\//
const PRISMA_IMPORT = new RegExp(
  String.raw`(?:\.\./)+infrastructure/database/prisma(?:['"]|/|$)`
)
const PRISMA_CLIENT_ACCESS = /\b(?:getPrismaClient|PrismaClient)\s*\(/

const PLATFORM_PRISMA_LEGACY_EXCEPTIONS = new Set()

const MUTATION = /router\.(post|put|patch|delete)\s*\(/g
const RESOURCE_ROUTE =
  /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]*\/:[^'"`]*)['"`]/g
const IDEMPOTENCY_MIDDLEWARE =
  /\b(?:requireIdempotency|idempotency(?:Middleware)?)\b/
const AUTHORIZATION_MIDDLEWARE =
  /\bauthorizeResource\b|\bauthorize[A-Z][A-Za-z0-9_]*\b/

const APPLICATION_SECURITY_IMPORT =
  /(?:\.\.\/)+platform\/applications\/(?:application|membership)[^'"`\s)]*/
const AUTHORIZATION_REPOSITORY_IMPORT =
  /(?:\.\.\/)+platform\/authorization\/access-control\.repository(?:\.js)?/

const isOBOPath = (relative) =>
  relative.startsWith('apps/api/src/apps/obo/') ||
  relative.startsWith('apps/api/src/modules/obo/')

const getApplicationSecurityViolations = (relative, source) => {
  const failures = []

  if (
    relative.startsWith('apps/api/src/features/') &&
    AUTHORIZATION_REPOSITORY_IMPORT.test(source)
  ) {
    failures.push(
      `${relative}: features must not access the platform authorization repository directly; use platform authorization enforcement/context APIs.`
    )
  }

  if (isOBOPath(relative) && APPLICATION_SECURITY_IMPORT.test(source)) {
    failures.push(
      `${relative}: OBO must consume application security through platform context/middleware, not import application-security repositories or services directly.`
    )
  }

  if (
    relative.startsWith('apps/api/src/platform/applications/') &&
    /(?:src\/apps|src\/modules|src\/features)\//.test(source)
  ) {
    failures.push(
      `${relative}: application security must remain domain-neutral and must not depend on apps, modules, or features.`
    )
  }

  return failures
}

const normalizeRelativePath = (file) =>
  path.relative(process.cwd(), file).replaceAll(path.sep, '/')
const isApplicationService = (relative) =>
  (relative.startsWith('apps/api/src/features/') ||
    relative.startsWith('apps/api/src/apps/') ||
    relative.startsWith('apps/api/src/platform/')) &&
  /(?:^|\/)\w+(?:\.query)?\.service\.(?:js|cjs|mjs)$/.test(relative)
const hasDirectPrismaAccess = (source) =>
  PRISMA_IMPORT.test(source) || PRISMA_CLIENT_ACCESS.test(source)
const isPlatformPrismaLegacyException = (relative) =>
  PLATFORM_PRISMA_LEGACY_EXCEPTIONS.has(relative)

const getLayerViolations = (relative, source) => {
  const failures = []
  if (
    relative.startsWith('apps/api/src/platform/') &&
    FORBIDDEN_PLATFORM_IMPORT.test(source)
  )
    failures.push(
      `${relative}: platform code must not import features or modules.`
    )
  if (
    relative.startsWith('apps/api/src/features/') &&
    FORBIDDEN_FEATURE_IMPORT.test(source)
  )
    failures.push(`${relative}: shared features must not import modules.`)
  if (
    relative.startsWith('apps/api/src/infrastructure/') &&
    FORBIDDEN_INFRASTRUCTURE_IMPORT.test(source)
  )
    failures.push(`${relative}: infrastructure must not import modules.`)
  if (
    relative.startsWith('apps/api/src/common/') &&
    FORBIDDEN_COMMON_IMPORT.test(source)
  )
    failures.push(
      `${relative}: common code must not import features, platform, or modules.`
    )
  if (
    relative.startsWith('apps/api/src/platform/') &&
    isApplicationService(relative) &&
    hasDirectPrismaAccess(source) &&
    !isPlatformPrismaLegacyException(relative)
  )
    failures.push(
      `${relative}: platform services must not access Prisma directly; use a repository or explicit infrastructure boundary.`
    )
  return failures
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
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
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
      failures.push(
        `${relative}: ${match[1].toUpperCase()} mutation must use shared idempotency middleware or an explicit 'idempotency: exempt' comment with justification.`
      )
    }
  }

  for (const match of source.matchAll(RESOURCE_ROUTE)) {
    const operationStart = match.index
    const statementEnd = findCallEnd(source, operationStart)
    const statement = source.slice(operationStart, statementEnd)

    if (!AUTHORIZATION_MIDDLEWARE.test(statement)) {
      failures.push(
        `${relative}: resource route '${match[2]}' must use authorizeResource or an explicit resource-authorization helper.`
      )
    }
  }

  return failures
}

module.exports = {
  FORBIDDEN_PLATFORM_IMPORT,
  FORBIDDEN_FEATURE_IMPORT,
  FORBIDDEN_INFRASTRUCTURE_IMPORT,
  FORBIDDEN_COMMON_IMPORT,
  PRISMA_IMPORT,
  PRISMA_CLIENT_ACCESS,
  PLATFORM_PRISMA_LEGACY_EXCEPTIONS,
  APPLICATION_SECURITY_IMPORT,
  AUTHORIZATION_REPOSITORY_IMPORT,
  normalizeRelativePath,
  isApplicationService,
  hasDirectPrismaAccess,
  isPlatformPrismaLegacyException,
  isOBOPath,
  getLayerViolations,
  getApplicationSecurityViolations,
  findCallEnd,
  getRouteViolations,
}
