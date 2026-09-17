import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const accessControlRepositoryPath = new URL('../../../src/platform/authorization/access-control.repository.js', import.meta.url)
const accessControlServicePath = new URL('../../../src/platform/authorization/access-control.service.js', import.meta.url)
const authorizeMiddlewarePath = new URL('../../../src/platform/authorization/authorize.js', import.meta.url)
const authorizationResourceMiddlewarePath = new URL('../../../src/platform/authorization/authorization-resource.middleware.js', import.meta.url)
const authorizationContextRoutePath = new URL('../../../src/platform/authorization/authorization-context.routes.js', import.meta.url)
const authorizationContextServicePath = new URL('../../../src/platform/authorization/authorization-context.service.js', import.meta.url)
const oboAuthorizationServicePath = new URL('../../../src/apps/obo/authorization/authorization.service.js', import.meta.url)
const oboAuthorizationRoutePath = new URL('../../../src/apps/obo/authorization/authorization.routes.js', import.meta.url)
const oboAppRoutePath = new URL('../../../src/apps/obo/obo.routes.js', import.meta.url)
const routesIndexPath = new URL('../../../src/routes/index.js', import.meta.url)
const appsPath = new URL('../../../src/apps/', import.meta.url)
const oboAppPath = new URL('../../../src/apps/obo/', import.meta.url)
const sourceRootPath = new URL('../../../src/', import.meta.url)
const featuresPath = new URL('../../../src/features/', import.meta.url)
const currentTestPath = fileURLToPath(import.meta.url)

const readText = (url) => readFile(url, 'utf8')

const collectSourceFiles = async (directoryUrl) => {
  const directory = fileURLToPath(directoryUrl)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(new URL(`./${entry.name}/`, directoryUrl))))
    } else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

describe('Authorization architecture contract', () => {
  it('keeps authorization persistence behind the application-scoped platform service boundary', async () => {
    const repository = await readText(accessControlRepositoryPath)
    const service = await readText(accessControlServicePath)

    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(repository).not.toContain('findRoleById')
    expect(service).toContain('./access-control.repository.js')
    expect(service).toContain('const requireAppId = (appId)')
    expect(service).toContain('const getAuthorizationContext = async (userId, appId)')
    expect(service).not.toContain('const getRoleById = async')
  })

  it('keeps authorization middleware dependent on services, not repositories', async () => {
    const middleware = await readText(authorizeMiddlewarePath)
    const resourceMiddleware = await readText(authorizationResourceMiddlewarePath)

    expect(middleware).toContain("./access-control.service.js")
    expect(middleware).not.toContain('access-control.repository.js')
    expect(resourceMiddleware).toContain("./access-control.service.js")
    expect(resourceMiddleware).not.toContain('access-control.repository.js')
  })

  it('prevents feature code from reaching into the authorization repository', async () => {
    const sourceFiles = await collectSourceFiles(featuresPath)

    for (const filePath of sourceFiles) {
      const source = await readFile(filePath, 'utf8')
      expect(source, `Direct authorization repository import in ${filePath}`).not.toContain(
        'platform/authorization/access-control.repository.js'
      )
    }
  })

  it('keeps application authorization management inside owning application boundaries', async () => {
    const appEntries = await readdir(fileURLToPath(appsPath), { withFileTypes: true })
    expect(appEntries.some((entry) => entry.name === 'admin')).toBe(false)

    const oboService = await readText(oboAuthorizationServicePath)
    const oboRoutes = await readText(oboAuthorizationRoutePath)

    expect(oboService).toContain("'obo_clients'")
    expect(oboService).toContain("'obo_forms'")
    expect(oboService).toContain("'obo_permit_types'")
    expect(oboService).toContain("'obo_plan_permits'")
    expect(oboService).toContain("'obo_professionals'")
    expect(oboService).toContain("'../../../platform/authorization/authorize.js'")
    expect(oboService).toContain("'../../../platform/authorization/authorization-resource.middleware.js'")
    expect(oboService).not.toContain('access-control.repository.js')

    expect(oboRoutes).toContain("'../authorization/authorization.service.js'")
    expect(oboRoutes).toContain("authorizeOBO('obo_authorization', 'manage')")
    expect(oboRoutes).toContain('requireApplicationContext')
    expect(oboRoutes).not.toContain("platform/authorization/authorize.js")
    expect(oboRoutes).not.toContain("platform/authorization/authorization-resource.middleware.js")

    const sourceFiles = await collectSourceFiles(sourceRootPath)
    for (const filePath of sourceFiles) {
      if (filePath === currentTestPath) continue
      const fileSource = await readFile(filePath, 'utf8')
      expect(fileSource, `Legacy Admin application reference in ${filePath}`).not.toContain(
        'apps/admin/authorization'
      )
      expect(fileSource, `Legacy Admin authorization feature reference in ${filePath}`).not.toContain(
        'features/admin/authorization'
      )
      expect(fileSource, `Legacy global authorization-admin reference in ${filePath}`).not.toContain(
        'features/authorization-admin'
      )
    }
  })

  it('registers application authorization routes through their owning application boundaries', async () => {
    const routesIndex = await readText(routesIndexPath)
    const oboRoutes = await readText(oboAppRoutePath)

    expect(routesIndex).toContain("../apps/obo/obo.routes.js")
    expect(routesIndex).toContain("router.use('/obo', oboRouter)")
    expect(routesIndex).not.toContain('../apps/admin/')
    expect(routesIndex).not.toContain('/admin/authorization')
    expect(routesIndex).not.toContain('features/authorization-admin')
    expect(routesIndex).not.toContain('features/authorization/authorization.routes.js')

    expect(oboRoutes).toContain("oboRouter.use(authenticate, requireApplicationContext({ appKey: 'obo' }))")
    expect(oboRoutes).toContain("oboRouter.use('/authorization', authorizationRoutes)")
  })

  it('keeps authorization-context route dependent on its service and outside the Auth feature', async () => {
    const route = await readText(authorizationContextRoutePath)
    const service = await readText(authorizationContextServicePath)

    expect(route).toContain("./authorization-context.service.js")
    expect(route).toContain('authenticate')
    expect(route).not.toContain('../../features/auth/')
    expect(route).not.toContain('authorization-context.repository.js')
    expect(route).not.toContain('getUserAuthorizationContext(')
    expect(service).toContain('authorization-context.repository.js')
    expect(service).toContain('getAuthorizationContextResponse')
  })
})
