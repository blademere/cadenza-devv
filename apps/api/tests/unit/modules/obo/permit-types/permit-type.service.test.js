import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
vi.mock('../../../../../src/platform/audit/audit.service.js')

const repository = await import('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
const audit = await import('../../../../../src/platform/audit/audit.service.js')
const { ConflictError, NotFoundError } = await import('../../../../../src/common/errors/appError.js')
const { createPermitType, updatePermitType } = await import('../../../../../src/modules/obo/permit-types/permit-type.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.withTransaction.mockImplementation((callback) => callback({}))
  audit.recordAudit.mockResolvedValue({ id: 'audit-1' })
})

describe('OBO permit type management', () => {
  it('creates a permit type and records an audit event', async () => {
    const created = { id: 'permit-1', key: 'building-permit', name: 'Building Permit', description: 'Building permits' }
    repository.findByKey.mockResolvedValue(null)
    repository.create.mockResolvedValue(created)

    await expect(createPermitType({ actorId: 'user-1', data: { key: 'building-permit', name: 'Building Permit', description: 'Building permits' } })).resolves.toEqual(created)
    expect(repository.create).toHaveBeenCalledWith(
      { key: 'building-permit', name: 'Building Permit', description: 'Building permits' },
      expect.anything(),
    )
    expect(audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'user-1',
      action: 'OBO_PERMIT_TYPE_CREATED',
      entityType: 'OboPermitType',
      entityId: 'permit-1',
      before: null,
      after: created,
      db: expect.anything(),
    }))
  })

  it('rejects a duplicate permit type key', async () => {
    repository.findByKey.mockResolvedValue({ id: 'existing', key: 'building-permit' })

    await expect(createPermitType({ actorId: 'user-1', data: { key: 'building-permit', name: 'Building Permit' } })).rejects.toBeInstanceOf(ConflictError)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('updates a permit type without exposing form reassignment', async () => {
    const before = { id: 'permit-1', key: 'building-permit', name: 'Building Permit', description: null, formId: 'form-1' }
    const after = { ...before, name: 'Building Permit Updated' }
    repository.findById.mockResolvedValue(before)
    repository.update.mockResolvedValue(after)

    await expect(updatePermitType({ actorId: 'user-1', id: 'permit-1', data: { name: 'Building Permit Updated' } })).resolves.toEqual(after)
    expect(repository.update).toHaveBeenCalledWith('permit-1', { name: 'Building Permit Updated' }, expect.anything())
    expect(audit.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'OBO_PERMIT_TYPE_UPDATED',
      before,
      after,
    }))
  })

  it('rejects an update for a missing permit type', async () => {
    repository.findById.mockResolvedValue(null)

    await expect(updatePermitType({ actorId: 'user-1', id: 'missing', data: { name: 'Updated' } })).rejects.toBeInstanceOf(NotFoundError)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects an update when the new key is already used', async () => {
    repository.findById.mockResolvedValue({ id: 'permit-1', key: 'building-permit' })
    repository.findByKey.mockResolvedValue({ id: 'permit-2', key: 'commercial-permit' })

    await expect(updatePermitType({ actorId: 'user-1', id: 'permit-1', data: { key: 'commercial-permit' } })).rejects.toBeInstanceOf(ConflictError)
    expect(repository.update).not.toHaveBeenCalled()
  })
})
