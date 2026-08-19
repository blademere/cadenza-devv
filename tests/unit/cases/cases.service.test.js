import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const repository = require('../../../src/features/cases/cases.repository')
const spies = {
  createCaseType: vi.spyOn(repository, 'createCaseType'),
  createCase: vi.spyOn(repository, 'createCase'),
  findCaseById: vi.spyOn(repository, 'findCaseById'),
  findCaseTypeById: vi.spyOn(repository, 'findCaseTypeById'),
  listCases: vi.spyOn(repository, 'listCases'),
  countCases: vi.spyOn(repository, 'countCases'),
  transitionCase: vi.spyOn(repository, 'transitionCase'),
}

const { createType, createRecord, transition } = await import('../../../src/features/cases/cases.service.js')

afterEach(() => vi.clearAllMocks())

describe('cases service', () => {
  it('normalizes case type and case names', async () => {
    spies.createCaseType.mockResolvedValue({ id: 'type-1', key: 'BUILDING', name: 'Building' })
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: true })
    spies.createCase.mockImplementation(async (data) => ({ id: 'case-1', ...data }))

    await expect(createType({ key: ' BUILDING ', name: ' Building ' })).resolves.toMatchObject({
      key: 'BUILDING', name: 'Building',
    })
    await expect(createRecord({ caseNumber: ' CASE-1 ', caseTypeId: 'type-1', title: ' Permit ' })).resolves.toMatchObject({
      caseNumber: 'CASE-1', title: 'Permit', status: 'DRAFT',
    })
  })

  it('rejects inactive case types', async () => {
    spies.findCaseTypeById.mockResolvedValue({ id: 'type-1', isActive: false })
    await expect(createRecord({ caseNumber: 'CASE-1', caseTypeId: 'type-1', title: 'Permit' }))
      .rejects.toThrow('Active case type not found.')
  })

  it('rejects a transition when the expected current status changed concurrently', async () => {
    spies.findCaseById.mockResolvedValue({ id: 'case-1', status: 'OPEN' })
    spies.transitionCase.mockResolvedValue(null)

    await expect(transition({ id: 'case-1', toStatus: 'CLOSED' }))
      .rejects.toThrow('Case status changed before this transition could be completed.')
  })
})
