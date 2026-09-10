import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const accessControlRepositoryPath = new URL('../../../src/platform/authorization/access-control.repository.js', import.meta.url)
const accessControlServicePath = new URL('../../../src/platform/authorization/access-control.service.js', import.meta.url)
const authorizeMiddlewarePath = new URL('../../../src/platform/authorization/authorize.js', import.meta.url)
const userServicePath = new URL('../../../src/features/users/user.service.js', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('Authorization architecture contract', () => {
  it('keeps authorization persistence behind the platform service boundary', async () => {
    const repository = await readText(accessControlRepositoryPath)
    const service = await readText(accessControlServicePath)

    expect(repository).toContain('../../infrastructure/database/prisma.js')
    expect(service).toContain('./access-control.repository.js')
    expect(service).toContain('const getRoleById = async')
    expect(service).toContain('getRoleById,')
  })

  it('keeps authorization middleware dependent on the service, not the repository', async () => {
    const middleware = await readText(authorizeMiddlewarePath)

    expect(middleware).toContain("./access-control.service.js")
    expect(middleware).not.toContain('access-control.repository.js')
  })

  it('prevents feature services from reaching into the authorization repository', async () => {
    const source = await readText(userServicePath)

    expect(source).not.toContain('platform/authorization/access-control.repository.js')
    expect(source).toContain('platform/authorization/access-control.service.js')
  })
})
