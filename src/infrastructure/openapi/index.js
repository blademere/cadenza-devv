const path = require('path')
const YAML = require('yamljs')
const { getRouteInventory, assertNoDuplicateRoutes } = require('./route-inventory')

const SPEC_PATH = path.resolve(__dirname, '../../../docs/openapi.yaml')
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'])

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function createGeneratedOperation(method, route) {
  const operationIdPath = route.path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^A-Za-z0-9]+(.)?/g, (_, next) => next ? next.toUpperCase() : ''))
    .join('') || 'root'

  return {
    tags: ['Auto-generated'],
    summary: `${method.toUpperCase()} ${route.path}`,
    operationId: `auto${method[0].toUpperCase()}${method.slice(1)}${operationIdPath}`,
    responses: {
      '200': {
        description: 'Successful response.',
      },
    },
    'x-generated-from': route.source,
  }
}

function buildOpenApiSpec({ allowGeneratedOperations = true } = {}) {
  const spec = YAML.load(SPEC_PATH)
  if (!spec || spec.openapi !== '3.0.3') {
    throw new Error('docs/openapi.yaml must be a valid OpenAPI 3.0.3 document.')
  }

  const inventory = getRouteInventory()
  assertNoDuplicateRoutes(inventory)
  const result = clone(spec)
  result.paths = result.paths || {}

  for (const route of inventory) {
    const pathItem = result.paths[route.path] || {}
    const method = route.method.toLowerCase()

    if (!HTTP_METHODS.has(method)) continue

    if (!pathItem[method] && allowGeneratedOperations) {
      pathItem[method] = createGeneratedOperation(method, route)
    }

    result.paths[route.path] = pathItem
  }

  return { spec: result, inventory }
}

function getOpenApiSpec() {
  return buildOpenApiSpec().spec
}

module.exports = {
  SPEC_PATH,
  buildOpenApiSpec,
  getOpenApiSpec,
}
