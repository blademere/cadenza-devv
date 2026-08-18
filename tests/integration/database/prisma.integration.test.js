import { beforeAll, afterAll, describe, expect, it } from 'vitest'

const { randomUUID } = require('node:crypto')
const { getPrismaClient } = require('../../../src/infrastructure/database/prisma')
const {
  getUserPermissions,
  findRoleById,
  findUserIdsByRoleId,
} = require('../../../src/features/access-control/access-control.repository')
const { findAllUsers } = require('../../../src/features/users/user.repository')

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

describeIfEnabled('Prisma/PostgreSQL integration', () => {
  let role
  let module
  const createdUserIds = []
  const createdPermissionIds = []
  const createdRoleIds = []
  const createdModuleIds = []
  const createdRefreshTokenIds = []

  beforeAll(async () => {
    await prisma.$connect()

    role = await prisma.role.create({
      data: {
        name: `integration-role-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    })
    createdRoleIds.push(role.id)

    module = await prisma.module.create({
      data: {
        key: `integration-module-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: `Integration Module ${Date.now()}`,
      },
    })
    createdModuleIds.push(module.id)

    const permissions = await prisma.permission.createManyAndReturn({
      data: [
        { moduleId: module.id, action: 'read' },
        { moduleId: module.id, action: 'create' },
      ],
    })
    createdPermissionIds.push(...permissions.map((permission) => permission.id))

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    })

    const user = await prisma.user.create({
      data: {
        email: `integration-user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
        passwordHash: 'integration-test-hash',
        roleId: role.id,
      },
    })
    createdUserIds.push(user.id)
  })

  afterAll(async () => {
    if (createdRefreshTokenIds.length) {
      await prisma.refreshToken.deleteMany({
        where: { id: { in: createdRefreshTokenIds } },
      })
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
    }
    if (createdRoleIds.length) {
      await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } })
    }
    if (createdPermissionIds.length) {
      await prisma.permission.deleteMany({
        where: { id: { in: createdPermissionIds } },
      })
    }
    if (createdModuleIds.length) {
      await prisma.module.deleteMany({ where: { id: { in: createdModuleIds } } })
    }
    await prisma.$disconnect()
  })

  it('connects to PostgreSQL and persists relational data', async () => {
    const foundRole = await prisma.role.findUnique({ where: { id: role.id } })
    const foundModule = await prisma.module.findUnique({ where: { id: module.id } })

    expect(foundRole).toEqual(expect.objectContaining({ id: role.id, name: role.name }))
    expect(foundModule).toEqual(expect.objectContaining({ id: module.id, key: module.key }))
  })

  it('enforces unique role and permission constraints', async () => {
    await expect(
      prisma.role.create({ data: { name: role.name } })
    ).rejects.toMatchObject({ code: 'P2002' })
    await expect(
      prisma.permission.create({
        data: { moduleId: module.id, action: 'read' },
      })
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('executes the user repository against PostgreSQL', async () => {
    const result = await findAllUsers({ skip: 0, take: 10 })
    expect(result.total).toBeGreaterThanOrEqual(1)
    expect(result.users.some((user) => user.id === createdUserIds[0])).toBe(
      true
    )
    expect(result.users[0].role).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      })
    )
  })

  it('resolves access-control permissions through PostgreSQL relationships', async () => {
    const userId = createdUserIds[0]
    const permissions = await getUserPermissions(userId)
    const roleFromRepository = await findRoleById(role.id)
    const userIds = await findUserIdsByRoleId(role.id)

    expect(permissions).toEqual(
      expect.arrayContaining([
        { resource: module.key, action: 'read' },
        { resource: module.key, action: 'create' },
      ])
    )
    expect(roleFromRepository).toEqual(
      expect.objectContaining({ id: role.id, name: role.name })
    )
    expect(userIds).toContain(userId)
  })

  it('creates and revokes refresh-token records in PostgreSQL', async () => {
    const userId = createdUserIds[0]
    const tokenHash = `integration-refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const token = await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenHash,
        userId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    })
    createdRefreshTokenIds.push(token.id)

    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    })

    const stored = await prisma.refreshToken.findUnique({ where: { id: token.id } })
    expect(stored?.revokedAt).not.toBeNull()
  })

  it('atomically rotates a refresh token inside a Prisma transaction', async () => {
    const userId = createdUserIds[0]
    const original = await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenHash: `integration-rotate-old-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    })
    const replacement = await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenHash: `integration-rotate-new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    })
    createdRefreshTokenIds.push(original.id, replacement.id)

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: original.id },
        data: { revokedAt: new Date(), replacedByTokenId: replacement.id },
      })
    })

    const stored = await prisma.refreshToken.findUnique({ where: { id: original.id } })
    expect(stored?.revokedAt).not.toBeNull()
    expect(stored?.replacedByTokenId).toBe(replacement.id)
  })
})
