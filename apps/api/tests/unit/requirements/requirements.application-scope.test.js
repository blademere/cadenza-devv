import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../src/features/requirements/requirements.repository.js', () => ({
  createDefinition: vi.fn(),
  findDefinitionById: vi.fn(),
  findDefinitionsByIds: vi.fn(),
  createCaseRequirement: vi.fn(),
  findCaseRequirement: vi.fn(),
  findCase: vi.fn(),
  listCaseRequirements: vi.fn(),
  updateCaseRequirement: vi.fn(),
}))

const repository = await import('../../../src/features/requirements/requirements.repository.js')
const service = await import('../../../src/features/requirements/requirements.service.js')

beforeEach(() => vi.clearAllMocks())

describe('application-scoped requirements', () => {
  it('requires appId when creating a definition', async () => {
    await expect(service.createRequirementDefinition({ key: 'REQ', name: 'Requirement' })).rejects.toThrow('appId is required')
  })

  it('persists definition ownership', async () => {
    repository.createDefinition.mockResolvedValue({ id: 'req-1', appId: 'app-1', key: 'REQ', name: 'Requirement' })
    await service.createRequirementDefinition({ key: ' REQ ', name: ' Requirement ' }, { appId: 'app-1' })
    expect(repository.createDefinition).toHaveBeenCalledWith({ appId: 'app-1', key: 'REQ', name: 'Requirement' }, undefined)
  })

  it('rejects definitions from another application when attaching', async () => {
    repository.findCase.mockResolvedValue({ id: 'case-1', appId: 'app-1' })
    repository.findDefinitionById.mockResolvedValue(null)
    await expect(service.attachToCase({ caseId: 'case-1', requirementId: 'req-2', appId: 'app-1' })).rejects.toThrow('Active requirement definition not found')
    expect(repository.findDefinitionById).toHaveBeenCalledWith('req-2', 'app-1', undefined)
  })

  it('scopes case requirement reads by application', async () => {
    repository.findCase.mockResolvedValue({ id: 'case-1', appId: 'app-1' })
    repository.listCaseRequirements.mockResolvedValue([])
    await expect(service.listForCase('case-1', { appId: 'app-1' })).resolves.toEqual([])
    expect(repository.listCaseRequirements).toHaveBeenCalledWith('case-1', 'app-1', undefined)
  })
})
