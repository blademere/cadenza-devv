import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/staff/staff.repository.js', () => ({
  findById: vi.fn(),
  findByPersonId: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../../../src/features/people/people.service.js', () => ({
  getById: vi.fn(),
}))

vi.mock('../../../src/platform/audit/audit.service.js', () => ({
  recordAudit: vi.fn(),
}))

const staffRepository = await import('../../../src/apps/cadenza/staff/staff.repository.js')
const peopleService = await import('../../../src/features/people/people.service.js')
const auditService = await import('../../../src/platform/audit/audit.service.js')
const staffService = await import('../../../src/apps/cadenza/staff/staff.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const PERSON_ID = '550e8400-e29b-41d4-a716-446655440001'
const STAFF_ID = '550e8400-e29b-41d4-a716-446655440002'

describe('Cadenza staff', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a staff profile from an authenticated Person and records an audit event', async () => {
    peopleService.getById.mockResolvedValue({ id: PERSON_ID, userId: 42, isActive: true })
    staffRepository.findByPersonId.mockResolvedValue(null)
    staffRepository.create.mockResolvedValue({
      id: STAFF_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      staffType: 'FRONT_DESK',
      status: 'ACTIVE',
    })

    const result = await staffService.create({
      appId: APP_ID,
      personId: PERSON_ID,
      staffType: 'FRONT_DESK',
      status: 'ACTIVE',
      actorId: 42,
    })

    expect(result.personId).toBe(PERSON_ID)
    expect(staffRepository.create).toHaveBeenCalledWith({
      appId: APP_ID,
      personId: PERSON_ID,
      staffType: 'FRONT_DESK',
      status: 'ACTIVE',
      metadata: null,
    })
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 42,
      appId: APP_ID,
      action: 'CADENZA_STAFF_CREATED',
      entityType: 'CadenzaStaff',
      entityId: STAFF_ID,
    }))
  })

  it('rejects staff without a linked User identity', async () => {
    peopleService.getById.mockResolvedValue({ id: PERSON_ID, userId: null, isActive: true })

    await expect(staffService.create({
      appId: APP_ID,
      personId: PERSON_ID,
      actorId: 42,
    })).rejects.toThrow('authenticated user identity')

    expect(staffRepository.create).not.toHaveBeenCalled()
  })

  it('updates staff profile state and audits the before/after records', async () => {
    const current = { id: STAFF_ID, appId: APP_ID, personId: PERSON_ID, staffType: 'STAFF', status: 'ACTIVE', metadata: null }
    const updated = { ...current, status: 'INACTIVE' }
    staffRepository.findById.mockResolvedValueOnce(current).mockResolvedValueOnce(updated)
    staffRepository.update.mockResolvedValue({ count: 1 })

    const result = await staffService.update({
      appId: APP_ID,
      id: STAFF_ID,
      status: 'INACTIVE',
      actorId: 42,
    })

    expect(result).toEqual(updated)
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'CADENZA_STAFF_UPDATED',
      before: current,
      after: updated,
    }))
  })
})
