const fs = require('fs')
const path = require('path')

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
])

const ROUTES_ROOT = path.resolve(__dirname, '../../..')
const ROOT_ROUTES_FILE = path.join(ROUTES_ROOT, 'routes', 'index.js')

function resolveRequire(fromFile, request) {
  if (!request.startsWith('.')) return null

  const base = path.resolve(path.dirname(fromFile), request)
  const candidates = [
    base,
    `${base}.js`,
    `${base}.cjs`,
    path.join(base, 'index.js'),
    path.join(base, 'index.cjs'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

function normalizePath(...segments) {
  const value = segments
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/:\w+/g, (match) => `{${match.slice(1)}}`)

  if (!value || value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}`
}

function parseRouterFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const imports = new Map()
  const mounts = []
  const routes = []

  const requirePattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const match of source.matchAll(requirePattern)) {
    const resolved = resolveRequire(filePath, match[2])
    if (resolved) imports.set(match[1], resolved)
  }

  const usePattern = /\b([A-Za-z_$][\w$]*)\.use\(\s*(?:['"]([^'"]*)['"]\s*,\s*)?([A-Za-z_$][\w$]*)/g
  for (const match of source.matchAll(usePattern)) {
    const prefix = match[2] || ''
    const child = imports.get(match[3])
    if (child) mounts.push({ prefix, file: child })
  }

  const routePattern = /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|options|head|trace)\(\s*['"]([^'"]*)['"]/g
  for (const match of source.matchAll(routePattern)) {
    if (!HTTP_METHODS.has(match[2])) continue
    routes.push({ method: match[2], path: match[3] || '/', file: filePath })
  }

  return { mounts, routes }
}

function collectRoutes(filePath, prefix = '', visited = new Set()) {
  const key = `${filePath}|${prefix}`
  if (visited.has(key)) return []
  visited.add(key)

  const parsed = parseRouterFile(filePath)
  const routes = parsed.routes.map((route) => ({
    method: route.method,
    path: normalizePath(prefix, route.path),
    source: path.relative(ROUTES_ROOT, route.file).replace(/\\/g, '/'),
  }))

  for (const mount of parsed.mounts) {
    routes.push(...collectRoutes(mount.file, normalizePath(prefix, mount.prefix), visited))
  }

  return routes
}

function getRouteInventory() {
  if (!fs.existsSync(ROOT_ROUTES_FILE)) {
    throw new Error(`Root Express router not found: ${ROOT_ROUTES_FILE}`)
  }

  const routes = collectRoutes(ROOT_ROUTES_FILE)
  const unique = new Map()

  for (const route of routes) {
    unique.set(`${route.method.toUpperCase()} ${route.path}`, route)
  }

  return [...unique.values()].sort((a, b) =>
    `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`)
  )
}

function assertNoDuplicateRoutes(routes) {
  const seen = new Set()
  for (const route of routes) {
    const key = `${route.method.toUpperCase()} ${route.path}`
    if (seen.has(key)) throw new Error(`Duplicate Express route discovered: ${key}`)
    seen.add(key)
  }
}

module.exports = {
  getRouteInventory,
  assertNoDuplicateRoutes,
}
