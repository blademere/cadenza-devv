import { describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => Object.fromEntries([
  'runTransaction', 'findById', 'findByIdWithVersions', 'findVersionById', 'findByKey', 'findVersion', 'findVersionForUpdate',
  'findLatestFormVersion', 'findByKeyWithDefinitions', 'createFormRecord', 'createVersionRecord', 'createDefinitionRecords',
  'findVersionWithDefinition', 'deleteFields', 'deleteSections', 'updateVersion', 'getUpdatedVersion', 'archivePublishedVersions',
  'createSubmissionRecord', 'findPublishedForm',
].map((name) => [name, vi.fn()])))

vi.mock('../../../src/platform/forms/form.repository.js', () => repository)
const formService = await import('../../../src/platform/forms/form.service.js')

describe('forms application scope', () => {
  it('requires appId for form lookup', async () => {
    await expect(formService.getFormById('form-1')).rejects.toThrow('Application context is required for forms.')
  })
  it('requires appId for form version lookup', async () => {
    await expect(formService.getFormVersionById('version-1')).rejects.toThrow('Application context is required for forms.')
  })
  it('passes appId into form repository lookups', async () => {
    repository.findById.mockResolvedValue({ id: 'form-1', appId: 'app-1' })
    await expect(formService.getFormById('form-1', 'app-1')).resolves.toEqual({ id: 'form-1', appId: 'app-1' })
    expect(repository.findById).toHaveBeenCalledWith('form-1', 'app-1', undefined)
  })
  it('passes appId into version repository lookups', async () => {
    repository.findVersionById.mockResolvedValue({ id: 'version-1', formId: 'form-1' })
    await expect(formService.getFormVersionById('version-1', 'app-1')).resolves.toEqual({ id: 'version-1', formId: 'form-1' })
    expect(repository.findVersionById).toHaveBeenCalledWith('version-1', 'app-1', undefined)
  })
})
