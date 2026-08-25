const fs = require('fs')
const path = require('path')
const swaggerUi = require('swagger-ui-express')

const OPENAPI_DIR = path.resolve(__dirname, '../../../openapi')
const OPENAPI_PATH = path.join(OPENAPI_DIR, 'openapi.yaml')

const registerSwagger = (app) => {
  app.get('/docs/openapi.yaml', (_req, res, next) => {
    try {
      const document = fs.readFileSync(OPENAPI_PATH, 'utf8')
      res
        .type('application/yaml')
        .set('Cache-Control', 'no-store')
        .send(document)
    } catch (error) {
      next(error)
    }
  })

  // Serve the multi-file OpenAPI source tree using paths relative to
  // /docs/openapi.yaml. This lets Swagger UI resolve external $refs.
  app.get('/docs/paths.yaml', (_req, res, next) => {
    res.sendFile(path.join(OPENAPI_DIR, 'paths.yaml'), (error) => {
      if (error) next(error)
    })
  })

  app.use('/docs/components', (req, res, next) => {
    const file = req.path.replace(/^\//, '')
    if (!file || file.includes('..') || file.includes('\\')) {
      return res.status(404).end()
    }
    return res.sendFile(path.join(OPENAPI_DIR, 'components', file), (error) => {
      if (error) next(error)
    })
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
