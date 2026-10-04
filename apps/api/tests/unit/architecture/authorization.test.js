import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const accessControlRepositoryPath = new URL(
  '../../../src/platform/authorization/access-control.repository.js',
  import.meta.url
)
const accessControlServicePath = new URL(
  '../../../src/platform/authorization/access-control.service.js',
  import.meta.url
)
const authorizeMiddlewarePath = new URL(
  '../../../src/platform/authorization/authorize.js',
  import.meta.url
)
const authorizationResourceMiddlewarePath = new URL(
  '../../../src/platform/authorization/authorization-resource.middleware.js',
  import.meta.url
)
const authorizationContextRoutePath = new URL(
  '../../../src/platform/authorization/authorization-context.routes.js',
  import.meta.url
)
const authorizationContextServicePath = new URL(
  '../../../src/platform/authorization/authorization-context.service.js',
  import.meta.url
)
const featuresPath = new URL('../../../src/features/', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

const collectSourceFiles = async (directoryUrl) => {
  const directory = fileURLToPath(directoryUrl)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory())
      files.push(
        ...(await collectSourceFiles(new URL(`./${entry.name}/`, directoryUrl)))
      )
    else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name))
      files.push(entryPath)
  }
  return files
}

describe('authorization architecture', () => {
  it('keeps authorization persistence behind the platform service boundary', async () => {
    const repository = await readText(accessControlRepositoryPath)
    const service = await readText(accessControlServicePath)
    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(service).toContain('./access-control.repository.js')
    expect(service).toContain('getUserAuthorizationContext')
    expect(service).not.toContain('getRoleById')
  })

  it('keeps authorization middleware dependent on services, not repositories', async () => {
    const middleware = await readText(authorizeMiddlewarePath)
    const resourceMiddleware = await readText(
      authorizationResourceMiddlewarePath
    )
    expect(middleware).toContain('./access-control.service.js')
    expect(middleware).not.toContain('access-control.repository.js')
    expect(resourceMiddleware).toContain('./access-control.service.js')
    expect(resourceMiddleware).not.toContain('access-control.repository.js')
  })

  it('prevents feature code from reaching into the authorization repository', async () => {
    const sourceFiles = await collectSourceFiles(featuresPath)
    for (const filePath of sourceFiles) {
      const source = await readFile(filePath, 'utf8')
      expect(
        source,
        `Direct authorization repository import in ${filePath}`
      ).not.toContain('platform/authorization/access-control.repository.js')
    }
  })

  it('keeps authorization-context route dependent on its service and outside the Auth feature', async () => {
    const route = await readText(authorizationContextRoutePath)
    const service = await readText(authorizationContextServicePath)
    expect(route).toContain('./authorization-context.service.js')
    expect(route).toContain('authenticate')
    expect(route).not.toContain('../../features/auth/')
    expect(route).not.toContain('authorization-context.repository.js')
    expect(route).not.toContain('getUserAuthorizationContext(')
    expect(service).toContain('authorization-context.repository.js')
    expect(service).toContain('getAuthorizationContextResponse')
  })
})
