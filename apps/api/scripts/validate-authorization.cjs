const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [
  path.join(ROOT, 'apps'),
  path.join(ROOT, 'features'),
  path.join(ROOT, 'modules'),
  path.join(ROOT, 'platform'),
]
const METHODS = /\b(?:router|[A-Za-z_$][\w$]*Router)\.(get|post|put|patch|delete|options|head|trace)\s*\(/g
const USE = /\b(?:router|[A-Za-z_$][\w$]*Router)\.use\s*\(/g
const AUTHENTICATE = /\bauthenticate\b/
const AUTHORIZE = /\bauthorize(?:Resource)?\b|\bauthorize[A-Z][A-Za-z0-9_]*\b|\b[A-Za-z_$][A-Za-z0-9_$]*Authorization\b/
const EXEMPTION = /authorization\s*:\s*public|authorization\s*:\s*auth-boundary/i

const LEGACY_AUTHORIZATION_PATHS = [
  'src/features/authorization/',
  'src/features/authorization-admin/',
  'src/features/authorization-admin.js',
  'src/features/admin/authorization/',
]

const LEGACY_AUTHORIZATION_PATTERNS = [
  /\/users\/:[^'"`\s]+\/role/,
  /assignUserRole\b/,
  /findRoleForAssignment\b/,
  /features\/authorization-admin/,
  /features\/authorization\//,
]

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const failures = []
const sourceFiles = ROUTE_ROOTS.flatMap(walk)
const routeFiles = sourceFiles.filter((file) => file.endsWith('.routes.js'))

for (const file of sourceFiles) {
  const relative = path.relative(path.resolve(__dirname, '..'), file).replaceAll(path.sep, '/')
  const source = fs.readFileSync(file, 'utf8')

  for (const legacyPath of LEGACY_AUTHORIZATION_PATHS) {
    if (relative === legacyPath.slice(0, -1) || relative.startsWith(legacyPath)) {
      failures.push(`${relative}: legacy authorization-management location is forbidden.`)
    }
  }

  for (const pattern of LEGACY_AUTHORIZATION_PATTERNS) {
    if (pattern.test(source)) failures.push(`${relative}: legacy global/application-role authorization pattern is forbidden.`)
  }
}

for (const file of routeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(path.resolve(__dirname, '..'), file).replaceAll(path.sep, '/')
  const isAuthFile = relative.startsWith('src/features/auth/')
  const isAuthorizationRoute = relative === 'src/platform/authorization/authorization.routes.js'
  const isApplicationRoute = relative.startsWith('src/apps/')
  const middlewareAliases = new Set(['authenticate'])
  const authorizationAliases = new Set(['authorize', 'authorizeResource'])

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]/g)) {
    if (AUTHENTICATE.test(match[2])) middlewareAliases.add(match[1])
    if (AUTHORIZE.test(match[2])) authorizationAliases.add(match[1])
  }
  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:authenticate|authorize\([^\n]+\)|authorizeResource\([\s\S]*?\))/g)) {
    if (AUTHENTICATE.test(match[0])) middlewareAliases.add(match[1])
    if (AUTHORIZE.test(match[0])) authorizationAliases.add(match[1])
  }

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([\s\S]*?)(?=\n\s*(?:const|let|var|router\.|export\b))/g)) {
    if (AUTHENTICATE.test(match[2])) middlewareAliases.add(match[1])
    if (AUTHORIZE.test(match[2])) authorizationAliases.add(match[1])
  }

  const inheritedMiddleware = []
  for (const match of source.matchAll(USE)) {
    const start = match.index + match[0].length
    let cursor = start
    let depth = 1
    let quote = null
    let escaped = false

    while (cursor < source.length && depth > 0) {
      const char = source[cursor]
      if (quote) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === quote) quote = null
      } else if (char === '\'' || char === '"' || char === '`') {
        quote = char
      } else if (char === '(') depth += 1
      else if (char === ')') depth -= 1
      cursor += 1
    }
    inheritedMiddleware.push(source.slice(start, cursor))
  }

  const inheritedAuthentication = inheritedMiddleware.some((statement) =>
    AUTHENTICATE.test(statement) || [...middlewareAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))
  )
  const inheritedAuthorization = inheritedMiddleware.some((statement) =>
    AUTHORIZE.test(statement) || [...authorizationAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))
  )

  if (isApplicationRoute && /authorization\.routes\.js$/.test(relative)) {
    if (!/requireApplicationContext/.test(source)) {
      failures.push(`${relative}: application-owned authorization route must establish application context.`)
    }
  }

  for (const match of source.matchAll(METHODS)) {
    const lineNumber = source.slice(0, match.index).split('\n').length
    let cursor = match.index + match[0].length
    let depth = 1
    let quote = null
    let escaped = false

    while (cursor < source.length && depth > 0) {
      const char = source[cursor]
      if (quote) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === quote) quote = null
      } else if (char === '\'' || char === '"' || char === '`') quote = char
      else if (char === '(') depth += 1
      else if (char === ')') depth -= 1
      cursor += 1
    }

    const statement = source.slice(match.index, cursor)
    if (EXEMPTION.test(statement) || isAuthFile) continue

    const hasAuthentication = inheritedAuthentication || [...middlewareAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))
    const hasAuthorization = inheritedAuthorization || AUTHORIZE.test(statement) || [...authorizationAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))

    if (!hasAuthentication) failures.push(`${relative}:${lineNumber}: route is missing authentication middleware.`)
    if (!isAuthorizationRoute && !hasAuthorization) failures.push(`${relative}:${lineNumber}: route is missing authorization middleware.`)
  }
}

if (failures.length > 0) {
  console.error('Authorization enforcement validation failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Authorization enforcement validation passed: ${routeFiles.length} route file(s) audited with application ownership and legacy-boundary checks.`)
