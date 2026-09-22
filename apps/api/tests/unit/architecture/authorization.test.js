import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const authorizationDirectory = new URL('../../../src/platform/authorization/', import.meta.url)
const repositoryPath = new URL('../../../src/platform/authorization/authorization.repository.js', import.meta.url)
const servicePath = new URL('../../../src/platform/authorization/authorization.service.js', import.meta.url)
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
  it('keeps authorization persistence behind the canonical platform repository', async () => {
    const repository = await readText(repositoryPath)
    const service = await readText(servicePath)
    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(service).toContain('./authorization.repository.js')
    expect(service).not.toContain('access-control.repository.js')
    expect(service).not.toContain('authorization-context.repository.js')
  })

  it('keeps authorization middleware dependent on the canonical service', async () => {
    const middleware = await readText(middlewarePath)
    expect(middleware).toContain('./authorization.service.js')
    expect(middleware).toContain('./authorization.policy.js')
    expect(middleware).not.toContain('authorization.repository.js')
  })

  it('keeps the authorization route dependent on the canonical service', async () => {
    const routes = await readText(routesPath)
    expect(routes).toContain('./authorization.service.js')
    expect(routes).toContain('authenticate')
    expect(routes).not.toContain('authorization-context.repository.js')
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

  it('does not leave legacy authorization implementation files behind', async () => {
    const directory = await readdir(fileURLToPath(authorizationDirectory))
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
})
