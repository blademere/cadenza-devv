import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OPENAPI_DIR = path.resolve(__dirname, '../../../openapi')
const OPENAPI_SOURCE_PATH = path.join(OPENAPI_DIR, 'openapi.yaml')
const OPENAPI_DIST_PATH = path.join(OPENAPI_DIR, 'dist', 'openapi.yaml')

const registerSwagger = (app) => {
  app.get('/docs/openapi.yaml', (_req, res, next) => {
    try {
      const document = fs.existsSync(OPENAPI_DIST_PATH)
        ? fs.readFileSync(OPENAPI_DIST_PATH, 'utf8')
        : fs.readFileSync(OPENAPI_SOURCE_PATH, 'utf8')

      res
        .type('application/yaml')
        .set('Cache-Control', 'no-store')
        .send(document)
    } catch (error) {
      next(error)
    }
  })

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      customSiteTitle: 'Cadenza App API Documentation',
      swaggerOptions: {
        url: '/docs/openapi.yaml',
        persistAuthorization: true,
      },
    })
  )
}

export { registerSwagger }
