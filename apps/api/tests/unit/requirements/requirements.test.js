import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/requirements/requirements.repository.js')

const repository = await import('../../../src/features/requirements/requirements.repository.js')
const { createRequirementDefinition, attachToCase, attachDefinitionsToCase } = await import('../../../src/features/requirements/requirements.service.js')
const spies = {
  createDefinition: repository.createDefinition,
  findDefinitionById: repository.findDefinitionById,
  findDefinitionsByIds: repository.findDefinitionsByIds,
  createCaseRequirement: repository.createCaseRequirement,
  findCaseRequirement: repository.findCaseRequirement,
  findCase: repository.findCase,
}

afterEach(() => vi.clearAllMocks())

describe('requirement definitions', () => {
  it('normalizes requirement definitions', async () => {
    spies.createDefinition.mockImplementation(async (data) => ({ id: 'req-1', ...data }))

    await expect(createRequirementDefinition(
      { key: ' VALID ', name: ' Valid Requirement ' },
      { appId: 'obo-app' },
    )).resolves.toMatchObject({
      key: 'VALID',
      name: 'Valid Requirement',
      appId: 'obo-app',
    })
  })
})

describe('case requirements', () => {
  it('attaches an active requirement to a case', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.findDefinitionById.mockResolvedValue({ id: 'req-1', appId: 'obo-app', isActive: true })
    spies.findCaseRequirement.mockResolvedValue(null)
    spies.createCaseRequirement.mockImplementation(async (data) => ({ id: 'cr-1', ...data }))

    await expect(attachToCase({ caseId: 'case-1', requirementId: 'req-1', appId: 'obo-app' })).resolves.toMatchObject({
      caseId: 'case-1',
      requirementId: 'req-1',
    })
  })

  it('attaches all active permit requirements to a case and preserves the transaction', async () => {
    const db = { tx: true }
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.findDefinitionsByIds.mockResolvedValue([
      { id: 'req-1', appId: 'obo-app', isActive: true },
      { id: 'req-2', appId: 'obo-app', isActive: true },
    ])
    spies.findCaseRequirement.mockResolvedValue(null)
    spies.createCaseRequirement.mockImplementation(async (data) => ({ id: `cr-${data.requirementId}`, ...data }))

    await expect(attachDefinitionsToCase({
      caseId: 'case-1',
      requirementIds: ['req-1', 'req-2'],
      metadata: { source: 'obo-plan-permit' },
      appId: 'obo-app',
      db,
    })).resolves.toEqual([
      { id: 'cr-req-1', caseId: 'case-1', requirementId: 'req-1', metadata: { source: 'obo-plan-permit' } },
      { id: 'cr-req-2', caseId: 'case-1', requirementId: 'req-2', metadata: { source: 'obo-plan-permit' } },
    ])
    expect(spies.findCase).toHaveBeenCalledWith('case-1', 'obo-app', db)
    expect(spies.findDefinitionsByIds).toHaveBeenCalledWith(['req-1', 'req-2'], 'obo-app', db)
    expect(spies.createCaseRequirement).toHaveBeenCalledTimes(2)
  })

  it('rejects duplicate or inactive requirements', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.findDefinitionById.mockResolvedValue({ id: 'req-1', appId: 'obo-app', isActive: false })

    await expect(attachToCase({ caseId: 'case-1', requirementId: 'req-1', appId: 'obo-app' })).rejects.toThrow('Active requirement definition not found.')
  })
})
