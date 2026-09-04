const fs = require('node:fs')
const path = require('node:path')
const { getCapabilityRegistry } = require('../src/platform/authorization/capability-registry')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [path.join(ROOT, 'features'), path.join(ROOT, 'modules'), path.join(ROOT, 'platform')]
const METHODS = /\b(?:router|[A-Za-z_$][\w$]*Router)\.(get|post|put|patch|delete|options|head|trace)\s*\(/g
const AUTHENTICATE = /\bauthenticate\b/
const AUTHORIZE = /\bauthorize(?:Resource)?\b|\bauthorize[A-Z][A-Za-z0-9_]*\b|\b[A-Za-z_$][A-Za-z0-9_$]*Authorization\b/
const EXEMPTION = /authorization\s*:\s*public|authorization\s*:\s*auth-boundary/i
const PERMISSION_KEY = /^[a-z0-9_-]+:[a-z0-9_-]+$/

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const failures = []
const capabilities = getCapabilityRegistry()
const capabilityKeys = new Set()

for (const capability of capabilities) {
  if (capabilityKeys.has(capability.key)) failures.push(`capability registry: duplicate capability key '${capability.key}'.`)
  capabilityKeys.add(capability.key)
  if (!PERMISSION_KEY.test(capability.permission)) failures.push(`capability registry: invalid permission key '${capability.permission}'.`)
  const [resource] = capability.permission.split(':')
  if (resource !== capability.moduleKey) failures.push(`capability registry: capability '${capability.key}' binds module '${capability.moduleKey}' to '${capability.permission}'.`)
}

const routeFiles = ROUTE_ROOTS.flatMap(walk).filter((file) => file.endsWith('.routes.js'))
for (const file of routeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(path.resolve(__dirname, '..'), file).replaceAll(path.sep, '/')
  const isAuthFile = relative.startsWith('src/features/auth/')
  const isAuthorizationContext = relative === 'src/platform/authorization/authorization-context.routes.js'
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

  // Support middleware factories declared as multiline arrow functions, e.g.
  // const resource = (action) => authorizeResource({ ... })
  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([\s\S]*?)(?=\n\s*(?:const|let|var|router\.|export\b))/g)) {
    if (AUTHENTICATE.test(match[2])) middlewareAliases.add(match[1])
    if (AUTHORIZE.test(match[2])) authorizationAliases.add(match[1])
  }

  for (const match of source.matchAll(METHODS)) {
    const lineNumber = source.slice(0, match.index).split('\n').length
    const start = match.index
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
      } else if (char === '\'' || char === '"' || char === '`') {
        quote = char
      } else if (char === '(') {
        depth += 1
      } else if (char === ')') {
        depth -= 1
      }
      cursor += 1
    }

    const statement = source.slice(start, cursor)
    if (EXEMPTION.test(statement) || isAuthFile) continue

    const hasAuthentication = [...middlewareAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))
    const hasAuthorization = AUTHORIZE.test(statement) || [...authorizationAliases].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(statement))

    if (!hasAuthentication) failures.push(`${relative}:${lineNumber}: route is missing authentication middleware.`)
    if (!isAuthorizationContext && !hasAuthorization) failures.push(`${relative}:${lineNumber}: route is missing authorization middleware.`)
  }
}

if (failures.length > 0) {
  console.error('Authorization enforcement validation failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log(`Authorization enforcement validation passed: ${routeFiles.length} route file(s) audited and ${capabilities.length} capabilities validated.`)