const fs = require('fs')
const path = require('path')
const YAML = require('yamljs')
const { buildOpenApiSpec, SPEC_PATH } = require('../src/infrastructure/openapi')

const outputPath = path.resolve(
  process.env.OPENAPI_OUTPUT || SPEC_PATH
)

const { spec, inventory } = buildOpenApiSpec()
const yaml = YAML.stringify(spec, 10, 2)

fs.writeFileSync(outputPath, yaml, 'utf8')

console.log(
  `OpenAPI generated: ${outputPath} (${inventory.length} Express routes, ${Object.keys(spec.paths).length} paths).`
)
