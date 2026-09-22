import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const authorizationDirectory = new URL('../../../src/platform/authorization/', import.meta.url)
const repositoryPath = new URL('../../../src/platform/authorization/authorization.repository.js', import.meta.url)
const servicePath = new URL('../../../src/platform/authorization/authorization.service.js', import.meta.url)
const cachePath = new URL('../../../src/platform/authorization/authorization.cache.js', import.meta.url)
const policyPath = new URL('../../../src/platform/authorization/authorization.policy.js', import.meta.url)
const middlewarePath = new URL('../../../src/platform/authorization/authorization.middleware.js', import.meta.url)
const routesPath = new URL('../../../src/platform/authorization/authorization.routes.js', import.meta.url)
const featuresPath = new URL('../../../src/features/', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

const collectSourceFiles = async (directoryUrl) => {
  const directory = fileURLToPath(directoryUrl)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(new URL(`./${entry.name}/`, directoryUrl))))
    else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name)) files.push(entryPath)
  }
  return files
}

describe('authorization architecture', () => {
  it('uses one canonical repository for authorization persistence', async () => {
    const repository = await readText(repositoryPath)
    const service = await readText(servicePath)

    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(service).toContain('./authorization.repository.js')
    expect(service).not.toContain('access-control.repository.js')
    expect(service).not.toContain('authorization-context.repository.js')
  })

  it('uses one canonical service for permission and authorization-context operations', async () => {
    const service = await readText(servicePath)

    expect(service).toContain('const hasPermission = async')
    expect(service).toContain('const getAuthorizationContext = async')
    expect(service).toContain('const getAuthorizationContextResponse = async')
    expect(service).toContain('const clearUserPermissionCache = async')
    expect(service).toContain('const clearRolePermissionCache = async')
  })

  it('keeps cache and policy responsibilities isolated from persistence', async () => {
    const cache = await readText(cachePath)
    const policy = await readText(policyPath)

    expect(cache).toContain('../../infrastructure/cache/redis.js')
    expect(cache).not.toContain('prisma')
    expect(policy).not.toContain('prisma')
    expect(policy).toContain('const evaluatePolicy = async')
    expect(policy).toContain('const assertPolicy = async')
  })

  it('combines authorization middleware behind one canonical middleware module', async () => {
    const middleware = await readText(middlewarePath)

    expect(middleware).toContain('const authorize = (')
    expect(middleware).toContain('const authorizeResource = (')
    expect(middleware).toContain("'./authorization.service.js'")
    expect(middleware).toContain("'./authorization.policy.js'")
    expect(middleware).not.toContain('authorization.repository.js')
  })

  it('keeps the authorization route dependent on the canonical service', async () => {
    const routes = await readText(routesPath)

    expect(routes).toContain("./authorization.service.js")
    expect(routes).toContain('authenticate')
    expect(routes).not.toContain('authorization-context.repository.js')
  })

  it('does not leave legacy authorization implementation files behind', async () => {
    const directory = await readdir(fileURLToPath(authorizationDirectory))
    expect(directory).toEqual(expect.arrayContaining([
      'authorization.cache.js',
      'authorization.middleware.js',
      'authorization.policy.js',
      'authorization.repository.js',
      'authorization.routes.js',
      'authorization.service.js',
    ]))

    expect(directory).not.toEqual(expect.arrayContaining([
      'access-control.cache.js',
      'access-control.policy.js',
      'access-control.repository.js',
      'access-control.service.js',
      'authorization-context.repository.js',
      'authorization-context.routes.js',
      'authorization-context.service.js',
      'authorization-resource.middleware.js',
      'authorize.js',
    ]))
  })

  it('prevents feature code from reaching into the authorization repository', async () => {
    const sourceFiles = await collectSourceFiles(featuresPath)
    for (const filePath of sourceFiles) {
      const source = await readFile(filePath, 'utf8')
      expect(source, `Direct authorization repository import in ${filePath}`).not.toContain(
        'platform/authorization/authorization.repository.js'
      )
    }
  })
})
