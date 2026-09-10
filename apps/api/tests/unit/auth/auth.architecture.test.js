import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const authRepositoryPath = new URL('../../../../src/features/auth/auth.repository.js', import.meta.url)
const authTokensPath = new URL('../../../../src/features/auth/auth.tokens.js', import.meta.url)
const authMaintenancePath = new URL('../../../../src/infrastructure/maintenance/auth-token.js', import.meta.url)
const userServicePath = new URL('../../../../src/features/users/user.service.js', import.meta.url)
const oauthServicePath = new URL('../../../../src/features/auth/oauth/oauth.service.js', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('Auth architecture contract', () => {
  it('keeps auth repository persistence-only', async () => {
    const source = await readText(authRepositoryPath)

    expect(source).toContain("../../infrastructure/database/prisma.js")
    expect(source).not.toContain('../../infrastructure/maintenance/')
    expect(source).not.toContain("from 'node:crypto'")
    expect(source).not.toContain('.service.js')
    expect(source).not.toContain('throw new Error')
    expect(source).not.toContain('OAUTH_ACCOUNT_ALREADY_LINKED')
    expect(source).not.toContain('LAST_AUTH_METHOD')
  })

  it('keeps token hashing in the auth token boundary', async () => {
    const repository = await readText(authRepositoryPath)
    const tokens = await readText(authTokensPath)

    expect(repository).not.toContain('hashRefreshToken')
    expect(repository).not.toContain('createHash(')
    expect(tokens).toContain('const hashToken')
    expect(tokens).toContain('createHash')
  })

  it('keeps refresh-token maintenance outside the auth feature repository', async () => {
    const repository = await readText(authRepositoryPath)
    const maintenance = await readText(authMaintenancePath)

    expect(repository).not.toContain('deleteExpiredRefreshTokens')
    expect(maintenance).toContain('deleteExpiredRefreshTokens')
  })

  it('prevents the Users feature from reaching into the Auth repository', async () => {
    const source = await readText(userServicePath)
    expect(source).not.toContain('../auth/auth.repository.js')
  })

  it('keeps OAuth policy in the OAuth service and persistence operations in the Auth repository', async () => {
    const repository = await readText(authRepositoryPath)
    const service = await readText(oauthServicePath)

    expect(repository).not.toContain('createOAuthUser')
    expect(repository).not.toContain('linkOAuthAccount')
    expect(repository).not.toContain('unlinkOAuthAccount')
    expect(repository).toContain('createOAuthAccount')
    expect(repository).toContain('deleteOAuthAccount')
    expect(service).toContain('findRoleByName')
    expect(service).toContain('countOAuthAccounts')
    expect(service).toContain('Cannot unlink the only authentication method')
  })
})
