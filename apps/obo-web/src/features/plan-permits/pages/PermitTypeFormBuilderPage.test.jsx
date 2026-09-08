import { describe, expect, it } from 'vitest'
import { createInitialFormDefinition, toPayload } from './PermitTypeFormBuilderPage'

describe('PermitTypeFormBuilderPage create-form to draft-version flow', () => {
  it('keeps the initial field when building the draft version payload after form creation', () => {
    const initialDefinition = createInitialFormDefinition()
    const createFormPayload = toPayload(initialDefinition)
    const draftVersionPayload = toPayload(initialDefinition)

    expect(createFormPayload.fields).toHaveLength(1)
    expect(draftVersionPayload.fields).toHaveLength(1)
    expect(draftVersionPayload.fields[0]).toEqual(expect.objectContaining({
      key: 'field-1',
      label: 'Field 1',
      type: 'text',
      required: false,
    }))
  })

  it('does not depend on the create-form response to populate draft fields', () => {
    const initialDefinition = createInitialFormDefinition()
    const createFormResponse = { id: 'form-1', versions: [{ version: 1, status: 'PUBLISHED' }] }

    const draftVersionPayload = toPayload(initialDefinition)

    expect(createFormResponse.versions[0].fields).toBeUndefined()
    expect(draftVersionPayload.fields).toHaveLength(1)
  })
})
