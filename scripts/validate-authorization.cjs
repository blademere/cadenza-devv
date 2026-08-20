const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..', 'src')
const ROUTE_ROOTS = [
  path.join(ROOT, 'features'),
  path.join(ROOT, 'modules'),
  path.join(ROOT, 'platform'),
]
const METHODS = /\brouter\.(get|post|put|patch|delete|options|head|trace)\s*\(/g
const AUTHENTICATE = /\bauthenticate\b/
const AUTHORIZE = /\bauthorize(?:Resource)?\b|\bauthorize[A-Z][A-Za-z0-9_]*\b/
const EXEMPTION = /authorization\s*:\s*public|authorization\s*:\s*auth-boundary/i

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const routeFiles = ROUTE_ROOTS.flatMap(walk).filter((file) => file.endsWith('.routes.js'))
const failures = []

for (const file of routeFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file).replaceAll(path.sep, '/')
  const isAuthBoundary = relative.startsWith('src/features/auth/') || relative === 'src/platform/authorization/authorization-context.routes.js'

  const middlewareAliases = new Set(['authenticate'])
  const authorizationAliases = new Set(['authorize', 'authorizeResource'])

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]/g)) {
    const name = match[1]
    const value = match[2]
    if (AUTHENTICATE.test(value)) middlewareAliases.add(name)
    if (AUTHORIZE.test(value)) authorizationAliases.add(name)
  }

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:authenticate|authorize\([^\n]+\)|authorizeResource\([^\n]+\))/g)) {
    const name = match[1]
    const value = match[0]
    if (AUTHENTICATE.test(value)) middlewareAliases.add(name)
    if (AUTHORIZE.test(value)) authorizationAliases.add(name)
  }

  for (const match of source.matchAll(METHODS)) {
    const lineStart = source.lastIndexOf('\n', match.index) + 1
    const lineEnd = source.indexOf('\n', match.index)
    const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
    const lineNumber = source.slice(0, match.index).split('\n').length

    if (EXEMPTION.test(line)) continue

    const hasAuthentication = [...middlewareAliases].some((name) =>
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(line),
    )
    const hasAuthorization = [...authorizationAliases].some((name) =>
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(line),
    )

    if (!hasAuthentication) {
      failures.push(`${relative}:${lineNumber}: route is missing authentication middleware.`)
    }

    if (!isAuthBoundary && !hasAuthorization) {
      failures.push(`${relative}:${lineNumber}: route is missing authorization middleware.`)
    }
  }
}

if (failures.length > 0) {
  console.error('Authorization enforcement validation failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Authorization enforcement validation passed: ${routeFiles.length} route file(s) audited.`)
