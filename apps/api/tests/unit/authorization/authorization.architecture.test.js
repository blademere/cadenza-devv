import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const accessControlRepositoryPath = new URL('../../../src/platform/authorization/access-control.repository.js', import.meta.url)
const accessControlServicePath = new URL('../../../src/platform/authorization/access-control.service.js', import.meta.url)
const authorizeMiddlewarePath = new URL('../../../src/platform/authorization/authorize.js', import.meta.url)
const authorizationResourceMiddlewarePath = new URL('../../../src/platform/authorization/authorization-resource.middleware.js', import.meta.url)
const authorizationAdminRoutePath = new URL('../../../src/features/authorization-admin/authorization-admin.routes.js', import.meta.url)
const featuresPath = new URL('../../../src/features/', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)))
    } else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

describe('Authorization architecture contract', () => {
  it('keeps authorization persistence behind the platform service boundary', async () => {
    const repository = await readText(accessControlRepositoryPath)
    const service = await readText(accessControlServicePath)

    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(service).toContain('./access-control.repository.js')
    expect(service).toContain('const getRoleById = async')
    expect(service).toContain('getRoleById,')
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

  it('keeps authorization-admin route resource loading behind its service', async () => {
    const source = await readText(authorizationAdminRoutePath)

    expect(source).toContain("./authorization-admin.service.js")
    expect(source).toContain('loadResource: getModuleById')
    expect(source).toContain('loadResource: getRoleById')
    expect(source).not.toContain("./authorization-admin.repository.js")
  })
})
