import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const repository = require('../../../src/features/requirements/requirements.repository')
const spies = {
  createDefinition: vi.spyOn(repository, 'createDefinition'),
  findDefinitionById: vi.spyOn(repository, 'findDefinitionById'),
  createCaseRequirement: vi.spyOn(repository, 'createCaseRequirement'),
  findCaseRequirement: vi.spyOn(repository, 'findCaseRequirement'),
  findCase: vi.spyOn(repository, 'findCase'),
}

const { createRequirementDefinition, attachToCase } =
  await import('../../../src/features/requirements/requirements.service.js')

afterEach(() => vi.clearAllMocks())

describe('requirements service', () => {
  it('normalizes requirement definitions', async () => {
    spies.createDefinition.mockImplementation(async (data) => ({ id: 'req-1', ...data }))
    await expect(createRequirementDefinition({ key: ' VALID ', name: ' Valid Requirement ' }))
      .resolves.toMatchObject({ key: 'VALID', name: 'Valid Requirement' })
  })

  it('attaches an active requirement to a case', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findDefinitionById.mockResolvedValue({ id: 'req-1', isActive: true })
    spies.findCaseRequirement.mockResolvedValue(null)
    spies.createCaseRequirement.mockImplementation(async (data) => ({ id: 'cr-1', ...data }))

    await expect(attachToCase({ caseId: 'case-1', requirementId: 'req-1' }))
      .resolves.toMatchObject({ caseId: 'case-1', requirementId: 'req-1' })
  })

  it('rejects duplicate or inactive requirements', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findDefinitionById.mockResolvedValue({ id: 'req-1', isActive: false })
    await expect(attachToCase({ caseId: 'case-1', requirementId: 'req-1' }))
      .rejects.toThrow('Active requirement definition not found.')
  })
})
