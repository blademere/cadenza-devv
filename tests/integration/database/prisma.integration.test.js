import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'

const crypto = require('crypto')
const { getPrismaClient } = require('../../../src/infrastructure/database/prisma')
const { findAllUsers } = require('../../../src/features/users/user.repository')
const { getUserPermissions, findRoleById, findUserIdsByRoleId } = require('../../../src/features/rbac/rbac.repository')
const { createRefreshTokenRecord, findRefreshToken, revokeRefreshToken, rotateRefreshToken } = require('../../../src/features/auth/auth.repository')
const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('Prisma/PostgreSQL integration', () => {
  let role
  let module
  let readPermission
  let createPermission
  const createdUserIds = []
  const createdRoleIds = []
  const createdModuleIds = []

  beforeAll(async () => {
    await prisma.$connect()
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    role = await prisma.role.create({ data: { name: `integration-role-${suffix}`, description: 'Created by Prisma/PostgreSQL integration tests' } })
    createdRoleIds.push(role.id)
    module = await prisma.module.create({ data: { key: `integration-module-${suffix}`, name: `Integration Module ${suffix}` } })
    createdModuleIds.push(module.id)
    ;[readPermission, createPermission] = await Promise.all([
      prisma.permission.create({ data: { moduleId: module.id, action: 'read' } }),
      prisma.permission.create({ data: { moduleId: module.id, action: 'create' } }),
    ])
    await prisma.rolePermission.createMany({ data: [
      { roleId: role.id, permissionId: readPermission.id },
      { roleId: role.id, permissionId: createPermission.id },
    ] })
  })

  beforeEach(async () => {
    const user = await prisma.user.create({ data: {
      email: `integration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: 'integration-test-hash', roleId: role.id,
    } })
    createdUserIds.push(user.id)
  })

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: createdUserIds } } })
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    }
    if (createdRoleIds.length) {
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: createdRoleIds } } })
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } })
    }
    if (createdModuleIds.length) {
      await prisma.permission.deleteMany({ where: { moduleId: { in: createdModuleIds } } })
      await prisma.module.deleteMany({ where: { id: { in: createdModuleIds } } })
    }
    await prisma.$disconnect()
  })

  it('connects to PostgreSQL and persists relational data', async () => {
    const user = await prisma.user.findUnique({ where: { id: createdUserIds[0] }, include: { role: true } })
    expect(user).not.toBeNull()
    expect(user.role.id).toBe(role.id)
    expect(user.role.name).toBe(role.name)
  })

  it('enforces unique role and permission constraints', async () => {
    await expect(prisma.role.create({ data: { name: role.name } })).rejects.toMatchObject({ code: 'P2002' })
    await expect(prisma.permission.create({ data: { moduleId: module.id, action: 'read' } })).rejects.toMatchObject({ code: 'P2002' })
  })

  it('executes the user repository against PostgreSQL', async () => {
    const result = await findAllUsers({ skip: 0, take: 10 })
    expect(result.total).toBeGreaterThanOrEqual(1)
    expect(result.users.some((user) => user.id === createdUserIds[0])).toBe(true)
    expect(result.users[0].role).toEqual(expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }))
  })

  it('resolves RBAC permissions through PostgreSQL relationships', async () => {
    const userId = createdUserIds[0]
    const permissions = await getUserPermissions(userId)
    const roleFromRepository = await findRoleById(role.id)
    const userIds = await findUserIdsByRoleId(role.id)
    expect(permissions).toEqual(expect.arrayContaining([`${module.key}:read`, `${module.key}:create`]))
    expect(roleFromRepository).toEqual(expect.objectContaining({ id: role.id, name: role.name }))
    expect(userIds).toContain(userId)
  })

  it('creates and revokes refresh-token records in PostgreSQL', async () => {
    const userId = createdUserIds[0]
    const tokenId = `integration-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const token = `integration-token-${tokenId}`
    await createRefreshTokenRecord({ tokenId, token, userId, expiresAt: new Date(Date.now() + 60000) })
    const stored = await findRefreshToken(token)
    expect(stored).not.toBeNull()
    expect(stored.user.id).toBe(userId)
    expect(stored.revokedAt).toBeNull()
    const result = await revokeRefreshToken(tokenId)
    expect(result.count).toBe(1)
    const revoked = await findRefreshToken(token)
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })

  it('atomically rotates a refresh token inside a Prisma transaction', async () => {
    const userId = createdUserIds[0]
    const currentTokenId = `integration-current-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newTokenId = `integration-new-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const currentToken = `integration-current-token-${currentTokenId}`
    const newToken = `integration-new-token-${newTokenId}`
    await createRefreshTokenRecord({ tokenId: currentTokenId, token: currentToken, userId, expiresAt: new Date(Date.now() + 60000) })
    const result = await rotateRefreshToken({ currentTokenId, newTokenId, newTokenHash: crypto.createHash('sha256').update(newToken).digest('hex'), userId, expiresAt: new Date(Date.now() + 120000) })
    expect(result).toEqual({ success: true })
    const current = await findRefreshToken(currentToken)
    const replacement = await findRefreshToken(newToken)
    expect(current.revokedAt).toBeInstanceOf(Date)
    expect(current.replacedByTokenId).toBe(newTokenId)
    expect(replacement.revokedAt).toBeNull()
    expect(replacement.user.id).toBe(userId)
  })
})
