const path = require('path')
const YAML = require('yamljs')

const specPath = path.resolve(__dirname, '..', 'docs', 'openapi.yaml')
const spec = YAML.load(specPath)

if (!spec || spec.openapi !== '3.0.3') throw new Error('docs/openapi.yaml must be a valid OpenAPI 3.0.3 document.')
if (!spec.info?.title || !spec.info?.version) throw new Error('OpenAPI info.title and info.version are required.')
if (!spec.paths || typeof spec.paths !== 'object' || Object.keys(spec.paths).length === 0) throw new Error('OpenAPI paths must not be empty.')
if (!spec.components?.securitySchemes?.bearerAuth) throw new Error('OpenAPI bearerAuth security scheme is required.')

const requiredAuthPaths = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/users',
]
for (const route of requiredAuthPaths) {
  if (!spec.paths[route]) throw new Error(`Missing required OpenAPI path: ${route}`)
}

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'])
for (const [route, definition] of Object.entries(spec.paths)) {
  if (!route.startsWith('/')) throw new Error(`Invalid OpenAPI path: ${route}`)
  for (const method of Object.keys(definition || {})) {
    if (!methods.has(method) && !['parameters', 'summary', 'description', '$ref'].includes(method)) {
      throw new Error(`Invalid HTTP operation '${method}' under ${route}`)
    }
  }
}

console.log(`OpenAPI validation passed: ${specPath} (${Object.keys(spec.paths).length} paths).`)
