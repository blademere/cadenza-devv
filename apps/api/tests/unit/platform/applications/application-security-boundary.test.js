import { describe, expect, it, vi, beforeEach } from 'vitest'

const prisma = {
  app: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  appMembership: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  appMembershipRole: {
    upsert: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  role: {
    findFirst: vi.fn(),
  },
}

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => prisma,
}))

const repository = await import('../../../../src/platform/applications/application.repository.js')

describe('application security boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('looks up applications by their unique key', async () => {
    prisma.app.findUnique.mockResolvedValue({ id: 'app-obo', key: 'obo', isActive: true })

    await expect(repository.getAppByKey('obo')).resolves.toEqual({
      id: 'app-obo',
      key: 'obo',
      isActive: true,
    })
    expect(prisma.app.findUnique).toHaveBeenCalledWith({ where: { key: 'obo' } })
  })

  it('lists only active applications for application selection', async () => {
    prisma.app.findMany.mockResolvedValue([])

    await repository.listActiveApps()

    expect(prisma.app.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    })
  })

  it('loads membership by the user and application compound key', async () => {
    prisma.appMembership.findUnique.mockResolvedValue(null)

    await repository.getMembership({ userId: '42', appId: 'app-obo' })

    expect(prisma.appMembership.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { appId_userId: { appId: 'app-obo', userId: 42 } },
      include: expect.objectContaining({ app: true, roles: expect.any(Object) }),
    }))
  })

  it('does not expose inactive memberships when listing user applications', async () => {
    prisma.appMembership.findMany.mockResolvedValue([])

    await repository.listUserApps(42)

    expect(prisma.appMembership.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 42,
        isActive: true,
        app: { isActive: true },
      },
    }))
  })

  it('uses the membership compound key when disabling access', async () => {
    prisma.appMembership.update.mockResolvedValue({ id: 'membership-1', isActive: false })

    await repository.disableMembership({ userId: 42, appId: 'app-obo' })

    expect(prisma.appMembership.update).toHaveBeenCalledWith({
      where: { appId_userId: { appId: 'app-obo', userId: 42 } },
      data: { isActive: false },
    })
  })

  it('assigns a membership role idempotently through the unique membership-role key', async () => {
    prisma.appMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      appId: 'app-obo',
      isActive: true,
      app: { isActive: true },
    })
    prisma.role.findFirst.mockResolvedValue({ id: 7 })
    prisma.appMembershipRole.upsert.mockResolvedValue({ id: 'assignment-1' })

    await repository.assignMembershipRole({ membershipId: 'membership-1', roleId: '7', appId: 'app-obo' })

    expect(prisma.appMembershipRole.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { membershipId_roleId: { membershipId: 'membership-1', roleId: 7 } },
      update: {},
      create: { membershipId: 'membership-1', roleId: 7 },
    }))
  })

  it('rejects membership role assignment when the membership belongs to another application', async () => {
    prisma.appMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      appId: 'app-cadenza',
      isActive: true,
      app: { isActive: true },
    })

    await expect(repository.assignMembershipRole({
      membershipId: 'membership-1',
      roleId: 7,
      appId: 'app-obo',
    })).resolves.toBeNull()
    expect(prisma.role.findFirst).not.toHaveBeenCalled()
    expect(prisma.appMembershipRole.upsert).not.toHaveBeenCalled()
  })

  it('rejects membership role assignment when the role is not owned by the membership application', async () => {
    prisma.appMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      appId: 'app-obo',
      isActive: true,
      app: { isActive: true },
    })
    prisma.role.findFirst.mockResolvedValue(null)

    await expect(repository.assignMembershipRole({
      membershipId: 'membership-1',
      roleId: 7,
      appId: 'app-obo',
    })).resolves.toBeNull()
    expect(prisma.appMembershipRole.upsert).not.toHaveBeenCalled()
  })

  it('lists all roles assigned to a membership', async () => {
    prisma.appMembershipRole.findMany.mockResolvedValue([
      { id: 'r1', role: { id: 3, name: 'receiving_officer' } },
      { id: 'r2', role: { id: 9, name: 'administrator' } },
    ])

    await expect(repository.listMembershipRoles('membership-1')).resolves.toHaveLength(2)
    expect(prisma.appMembershipRole.findMany).toHaveBeenCalledWith({
      where: { membershipId: 'membership-1' },
      include: { role: true },
      orderBy: { role: { name: 'asc' } },
    })
  })
})
