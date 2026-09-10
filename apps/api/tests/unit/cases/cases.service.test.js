import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/cases/cases.repository.js')

const repository = await import('../../../src/features/cases/cases.repository.js')
const { generateCaseNumber, createType, createRecord, transition } = await import('../../../src/features/cases/cases.service.js')
const spies = { createCaseType: repository.createCaseType, createCase: repository.createCase, findCaseById: repository.findCaseById, findCaseTypeById: repository.findCaseTypeById, listCases: repository.listCases, countCases: repository.countCases, transitionCase: repository.transitionCase }

afterEach(() => vi.clearAllMocks())

describe('cases service', () => {
  it('generates a platform-owned case number', () => {
    expect(generateCaseNumber()).toMatch(/^CASE-\d{8}-[0-9A-F]{8}$/)
  })

  it('normalizes case type and case names', async () => {
    spies.createCaseType.mockResolvedValue({ id: 'type-1', key: 'BUILDING', name: 'Building' })
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: true })
    spies.createCase.mockImplementation(async (data) => ({ id: 'case-1', ...data }))
    await expect(createType({ key: ' BUILDING ', name: ' Building ' })).resolves.toMatchObject({ key: 'BUILDING', name: 'Building' })
    await expect(createRecord({ caseNumber: ' CASE-1 ', caseTypeId: 'type-1', title: ' Permit ' })).resolves.toMatchObject({ caseNumber: 'CASE-1', title: 'Permit', status: 'DRAFT' })
  })

  it('generates a case number when the caller does not provide one', async () => {
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: true })
    spies.createCase.mockImplementation(async (data) => ({ id: 'case-1', ...data }))
    await expect(createRecord({ caseTypeId: 'type-1', title: 'Permit' })).resolves.toMatchObject({ caseNumber: expect.stringMatching(/^CASE-\d{8}-[0-9A-F]{8}$/), status: 'DRAFT' })
  })

  it('rejects inactive case types', async () => {
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: false })
    await expect(createRecord({ caseNumber: 'CASE-1', caseTypeId: 'type-1', title: 'Permit' })).rejects.toThrow('Active case type not found.')
  })

  it('rejects a transition when the expected current status changed concurrently', async () => {
    spies.findCaseById.mockResolvedValue({ id: 'case-1', status: 'OPEN' })
    spies.transitionCase.mockResolvedValue(null)
    await expect(transition({ id: 'case-1', toStatus: 'CLOSED' })).rejects.toThrow('Case status changed before this transition could be completed.')
  })
})
