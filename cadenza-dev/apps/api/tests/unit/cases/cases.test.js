import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/cases/cases.repository.js')

const repository = await import('../../../src/features/cases/cases.repository.js')
const { generateCaseNumber, createType, createRecord, getById, transition } = await import('../../../src/features/cases/cases.service.js')
const spies = {
  createCaseType: repository.createCaseType,
  createCase: repository.createCase,
  findCaseById: repository.findCaseById,
  findCaseTypeById: repository.findCaseTypeById,
  listCases: repository.listCases,
  countCases: repository.countCases,
  transitionCase: repository.transitionCase,
}

afterEach(() => vi.clearAllMocks())

describe('case numbering', () => {
  it('generates a platform-owned case number', () => {
    expect(generateCaseNumber()).toMatch(/^CASE-\d{8}-[0-9A-F]{8}$/)
  })

  it('generates a case number when the caller does not provide one', async () => {
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: true })
    spies.createCase.mockImplementation(async (data) => ({ id: 'case-1', ...data }))

    await expect(createRecord({ caseTypeId: 'type-1', title: 'Permit' }, { appId: 'app-obo' })).resolves.toMatchObject({
      appId: 'app-obo',
      caseNumber: expect.stringMatching(/^CASE-\d{8}-[0-9A-F]{8}$/),
      status: 'DRAFT',
    })
    expect(spies.createCase).toHaveBeenCalledWith(expect.objectContaining({ appId: 'app-obo' }), undefined)
  })

  it('rejects creation without an application context', async () => {
    await expect(createRecord({ caseTypeId: 'type-1', title: 'Permit' })).rejects.toThrow('appId is required.')
    expect(spies.createCase).not.toHaveBeenCalled()
  })
})

describe('case types and records', () => {
  it('normalizes case type and case names', async () => {
    spies.createCaseType.mockResolvedValue({ id: 'type-1', key: 'BUILDING', name: 'Building' })
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: true })
    spies.createCase.mockImplementation(async (data) => ({ id: 'case-1', ...data }))

    await expect(createType({ key: ' BUILDING ', name: ' Building ' })).resolves.toMatchObject({
      key: 'BUILDING',
      name: 'Building',
    })
    await expect(createRecord({ caseNumber: ' CASE-1 ', caseTypeId: 'type-1', title: ' Permit ' }, { appId: 'app-obo' })).resolves.toMatchObject({
      appId: 'app-obo',
      caseNumber: 'CASE-1',
      title: 'Permit',
      status: 'DRAFT',
    })
  })

  it('rejects inactive case types', async () => {
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: false })

    await expect(createRecord({ caseNumber: 'CASE-1', caseTypeId: 'type-1', title: 'Permit' }, { appId: 'app-obo' })).rejects.toThrow('Active case type not found.')
  })
})

describe('case application isolation', () => {
  it('requires an application context when reading a case', async () => {
    await expect(getById('case-1')).rejects.toThrow('appId is required.')
    expect(spies.findCaseById).not.toHaveBeenCalled()
  })

  it('returns only a case owned by the requested application', async () => {
    spies.findCaseById.mockResolvedValue({ id: 'case-1', appId: 'app-obo', status: 'OPEN' })

    await expect(getById('case-1', { appId: 'app-obo' })).resolves.toMatchObject({
      id: 'case-1',
      appId: 'app-obo',
    })
    expect(spies.findCaseById).toHaveBeenCalledWith('case-1', expect.objectContaining({ appId: 'app-obo' }))
  })

  it('does not expose a case from another application', async () => {
    spies.findCaseById.mockResolvedValue(null)

    await expect(getById('case-admin', { appId: 'app-obo' })).rejects.toThrow('Case not found.')
    expect(spies.findCaseById).toHaveBeenCalledWith('case-admin', expect.objectContaining({ appId: 'app-obo' }))
  })
})

describe('case transitions', () => {
  it('rejects a transition when the expected current status changed concurrently', async () => {
    spies.findCaseById.mockResolvedValue({ id: 'case-1', status: 'OPEN', appId: 'app-obo' })
    spies.transitionCase.mockResolvedValue(null)

    await expect(transition({ id: 'case-1', appId: 'app-obo', toStatus: 'CLOSED' })).rejects.toThrow('Case status changed before this transition could be completed.')
    expect(spies.transitionCase).toHaveBeenCalledWith('case-1', 'app-obo', 'OPEN', 'CLOSED', undefined, undefined, undefined, undefined)
  })
})
