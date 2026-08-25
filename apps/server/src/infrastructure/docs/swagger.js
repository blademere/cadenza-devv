const fs = require('fs')
const path = require('path')
const swaggerUi = require('swagger-ui-express')

const OPENAPI_BUNDLE_PATH = path.resolve(
  __dirname,
  '../../../openapi/dist/openapi.yaml'
)

const registerSwagger = (app) => {
  app.get('/docs/openapi.yaml', (_req, res, next) => {
    try {
      const document = fs.readFileSync(OPENAPI_BUNDLE_PATH, 'utf8')
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
      customSiteTitle: 'Express App API Documentation',
      swaggerOptions: {
        url: '/docs/openapi.yaml',
        persistAuthorization: true,
      },
    })
  )
}

module.exports = { registerSwagger }
