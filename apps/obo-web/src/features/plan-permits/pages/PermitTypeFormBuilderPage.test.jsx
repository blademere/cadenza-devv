import { describe, expect, it } from 'vitest'
import { createInitialFormDefinition, resolvePermitTypeId, toPayload } from './PermitTypeFormBuilderPage'

describe('PermitTypeFormBuilderPage create-form to draft-version flow', () => {
  it('uses the same non-empty payload for create form and first draft version', () => {
    const initialDefinition = createInitialFormDefinition()
    const initialPayload = toPayload(initialDefinition)

    expect(initialPayload.fields).toHaveLength(1)
    expect(initialPayload.fields[0]).toEqual(expect.objectContaining({
      key: 'field-1',
      label: 'Field 1',
      type: 'text',
      required: false,
    }))

    const createFormRequest = {
      id: 'permit-type-1',
      key: 'building-application',
      name: 'Building Application',
      entityType: 'OboPermitApplication',
      ...initialPayload,
    }
    const draftVersionRequest = {
      id: 'permit-type-1',
      ...initialPayload,
    }

    expect(draftVersionRequest.sections).toEqual(createFormRequest.sections)
    expect(draftVersionRequest.fields).toEqual(createFormRequest.fields)
    expect(draftVersionRequest.fields).toHaveLength(1)
  })

  it('does not derive draft fields from a create-form response without field definitions', () => {
    const initialDefinition = createInitialFormDefinition()
    const createFormResponse = { id: 'form-1', versions: [{ version: 1, status: 'PUBLISHED' }] }
    const draftVersionRequest = { id: 'permit-type-1', ...toPayload(initialDefinition) }

    expect(createFormResponse.versions[0].fields).toBeUndefined()
    expect(draftVersionRequest.fields).toHaveLength(1)
  })

  it('prefers the current permitTypeId route param and supports the legacy id param', () => {
    expect(resolvePermitTypeId({ permitTypeId: 'current-id', id: 'legacy-id' })).toBe('current-id')
    expect(resolvePermitTypeId({ id: 'legacy-id' })).toBe('legacy-id')
    expect(resolvePermitTypeId({})).toBeNull()
  })
})
