import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/platform/audit/audit.service.js', () => ({
  recordAudit: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}))

vi.mock('../../../src/features/resources/resource.repository.js', () => ({
  withTransaction: vi.fn(),
  findResource: vi.fn(),
  findResourceByKey: vi.fn(),
  listResources: vi.fn(),
  createResource: vi.fn(),
  updateResource: vi.fn(),
  activateResource: vi.fn(),
  deactivateResource: vi.fn(),
}))

const { RESOURCE_MODULE, RESOURCE_ACTIONS, RESOURCE_STATUS } =
  await import('../../../src/features/resources/resource.constants.js')
const { mapResource } =
  await import('../../../src/features/resources/resource.mapper.js')
const service = await import('../../../src/features/resources/resource.service.js')
const repository = await import('../../../src/features/resources/resource.repository.js')
const audit = await import('../../../src/platform/audit/audit.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation((callback) => callback({}))
})

describe('resource constants', () => {
  it('exposes only generic resource values', () => {
    expect(RESOURCE_MODULE).toBe('resources')
    expect(RESOURCE_ACTIONS).toMatchObject({
      READ: 'read',
      CREATE: 'create',
      UPDATE: 'update',
      ACTIVATE: 'activate',
      DEACTIVATE: 'deactivate',
      MANAGE: 'manage',
    })
    expect(RESOURCE_STATUS).toEqual({
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
    })
  })
})

describe('resource mapper', () => {
  it('maps the stable resource representation', () => {
    const createdAt = new Date('2026-09-18T00:00:00.000Z')
    expect(mapResource({
      id: 'resource-1',
      appId: 'app-1',
      key: 'counter-1',
      name: 'Counter 1',
      type: 'counter',
      status: 'ACTIVE',
      description: null,
      metadata: { floor: 1 },
      createdAt,
      updatedAt: createdAt,
      internalOnly: 'secret',
    })).toEqual({
      id: 'resource-1',
      appId: 'app-1',
      key: 'counter-1',
      name: 'Counter 1',
      type: 'counter',
      status: 'ACTIVE',
      description: null,
      metadata: { floor: 1 },
      createdAt,
      updatedAt: createdAt,
    })
  })
})

describe('resource service', () => {
  it('requires application context and required creation fields', () => {
    expect(() => service.listResources({})).toThrow('Application context is required.')
    expect(() => service.validateCreateInput({ name: 'x', type: 'y' }))
      .toThrow('Resource key is required.')
  })

  it('defaults new resources to ACTIVE', () => {
    expect(service.validateCreateInput({
      key: 'k',
      name: 'Name',
      type: 'generic',
    })).toEqual({
      key: 'k',
      name: 'Name',
      type: 'generic',
      status: 'ACTIVE',
      description: null,
      metadata: null,
    })
  })

  it('rejects invalid metadata and empty updates', () => {
    expect(() => service.validateCreateInput({
      key: 'k',
      name: 'Name',
      type: 'generic',
      metadata: [],
    })).toThrow('Resource metadata must be a JSON object.')

    expect(() => service.validateUpdateInput({}))
      .toThrow('At least one resource field must be updated.')
  })

  it('rejects invalid statuses', () => {
    expect(() => service.validateCreateInput({
      key: 'k',
      name: 'Name',
      type: 'generic',
      status: 'DELETED',
    })).toThrow('Resource status is invalid.')

    expect(() => service.listResources({
      appId: 'app-1',
      status: 'DELETED',
    })).toThrow('Resource status is invalid.')
  })

  it('creates and audits a resource inside one transaction', async () => {
    repository.findResourceByKey.mockResolvedValue(null)
    repository.createResource.mockResolvedValue({
      id: 'resource-1',
      appId: 'app-1',
      key: 'k',
      name: 'Name',
      type: 'generic',
      status: 'ACTIVE',
    })

    await service.createResource({
      actorId: 7,
      appId: 'app-1',
      data: { key: 'k', name: 'Name', type: 'generic' },
    })

    expect(repository.createResource).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-1', key: 'k' }),
      expect.anything(),
    )
    expect(audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 7,
      appId: 'app-1',
      action: 'RESOURCE_CREATED',
      entityType: 'Resource',
      db: expect.anything(),
    }))
  })

  it('rejects duplicate keys inside the same application', async () => {
    repository.findResourceByKey.mockResolvedValue({ id: 'existing' })

    await expect(service.createResource({
      appId: 'app-1',
      data: { key: 'k', name: 'Name', type: 'generic' },
    })).rejects.toThrow('already exists in this application')
  })

  it('isolates every repository operation by appId', async () => {
    repository.findResource
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'resource-1', appId: 'app-1', status: 'INACTIVE' })
    repository.findResourceByKey.mockResolvedValue(null)
    repository.listResources.mockResolvedValue([])
    repository.updateResource.mockResolvedValue({ count: 1 })
    repository.activateResource.mockResolvedValue({ count: 1 })
    repository.deactivateResource.mockResolvedValue({ count: 1 })

    await service.getResource({ id: 'resource-1', appId: 'app-1' }).catch(() => undefined)
    await service.getResourceByKey({ key: 'resource-key', appId: 'app-1' }).catch(() => undefined)
    await service.listResources({ appId: 'app-1' })
    await service.updateResource({
      actorId: 1,
      appId: 'app-1',
      id: 'resource-1',
      data: { name: 'Updated' },
    }).catch(() => undefined)
    await service.activateResource({
      actorId: 1,
      appId: 'app-1',
      id: 'resource-1',
    }).catch(() => undefined)
    await service.deactivateResource({
      actorId: 1,
      appId: 'app-1',
      id: 'resource-1',
    }).catch(() => undefined)

    expect(repository.findResource).toHaveBeenCalledWith(
      'resource-1',
      'app-1',
      expect.anything(),
    )
    expect(repository.findResourceByKey).toHaveBeenCalledWith(
      'resource-key',
      'app-1',
      undefined,
    )
    expect(repository.listResources).toHaveBeenCalledWith({
      appId: 'app-1',
      status: undefined,
      type: undefined,
    }, undefined)
    expect(repository.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-1' }),
      expect.anything(),
    )
    expect(repository.activateResource).toHaveBeenCalledWith(
      'resource-1',
      'app-1',
      expect.anything(),
    )
    expect(repository.deactivateResource).toHaveBeenCalledWith(
      'resource-1',
      'app-1',
      expect.anything(),
    )
  })

  it('transitions status and audits changes', async () => {
    repository.findResource
      .mockResolvedValueOnce({
        id: 'resource-1',
        appId: 'app-1',
        status: 'INACTIVE',
      })
      .mockResolvedValueOnce({
        id: 'resource-1',
        appId: 'app-1',
        status: 'ACTIVE',
      })
    repository.activateResource.mockResolvedValue({ count: 1 })

    await service.activateResource({
      actorId: 7,
      appId: 'app-1',
      id: 'resource-1',
    })

    expect(audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'RESOURCE_ACTIVATED',
      entityId: 'resource-1',
    }))
  })
})
