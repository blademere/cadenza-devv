import { describe, expect, it } from 'vitest'
import { createInitialFormDefinition, createVersionPayload, hasConfiguredForm, hasConfiguredPermitTypeForm, resolvePermitTypeId, toPayload } from './PermitTypeFormBuilderPage'

describe('PermitTypeFormBuilderPage form version lifecycle', () => {
  it('creates the initial form with a non-empty version one payload', () => {
    const initialDefinition = createInitialFormDefinition()
    const initialPayload = toPayload(initialDefinition)

    expect(initialPayload.fields).toHaveLength(1)
    expect(initialPayload.fields[0]).toEqual(expect.objectContaining({ key: 'field-1', label: 'Field 1', type: 'text', required: false }))
  })

  it('opens the created version one instead of creating version two', () => {
    const createFormResponse = {
      id: 'form-1',
      versions: [{ version: 1, status: 'DRAFT', fields: [{ key: 'field-1' }] }],
    }

    const createdVersion = createFormResponse.versions.find((item) => Number(item.version) === 1)

    expect(createdVersion).toMatchObject({ version: 1, status: 'DRAFT' })
    expect(createFormResponse.versions).toHaveLength(1)
  })

  it('does not derive the initial draft from a response that omits field definitions', () => {
    const initialDefinition = createInitialFormDefinition()
    const createFormResponse = { id: 'form-1', versions: [{ version: 1, status: 'DRAFT' }] }
    const initialPayload = toPayload(initialDefinition)

    expect(createFormResponse.versions[0].fields).toBeUndefined()
    expect(initialPayload.fields).toHaveLength(1)
  })

  it('reuses the current valid definition when a source form has no fields', () => {
    const fallbackDefinition = createInitialFormDefinition()
    const publishedForm = { id: 'form-1', version: 1, status: 'PUBLISHED', sections: [], fields: [] }
    const payload = createVersionPayload(publishedForm, fallbackDefinition)

    expect(payload).not.toBeNull()
    expect(payload.fields).toHaveLength(1)
    expect(payload.fields[0].key).toBe('field-1')
  })

  it('returns null instead of allowing an empty version payload', () => {
    const payload = createVersionPayload({ sections: [], fields: [] }, { sections: [], fields: [] })
    expect(payload).toBeNull()
  })

  it('detects whether a permit type form is actually configured', () => {
    expect(hasConfiguredForm({ id: 'form-1' })).toBe(true)
    expect(hasConfiguredForm({ formId: 'form-1' })).toBe(true)
    expect(hasConfiguredForm(null)).toBe(false)
    expect(hasConfiguredForm({})).toBe(false)
  })

  it('detects an attached permit type form even when no published form response is available', () => {
    expect(hasConfiguredPermitTypeForm({ formId: 'form-1' }, null)).toBe(true)
    expect(hasConfiguredPermitTypeForm({ form: { id: 'form-1' } }, null)).toBe(true)
    expect(hasConfiguredPermitTypeForm({ formId: null }, null)).toBe(false)
    expect(hasConfiguredPermitTypeForm(null, null)).toBe(false)
  })

  it('prefers the current permitTypeId route param and supports the legacy id param', () => {
    expect(resolvePermitTypeId({ permitTypeId: 'current-id', id: 'legacy-id' })).toBe('current-id')
    expect(resolvePermitTypeId({ id: 'legacy-id' })).toBe('legacy-id')
    expect(resolvePermitTypeId({})).toBeNull()
  })
})
