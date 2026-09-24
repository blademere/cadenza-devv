import { describe, expect, it } from 'vitest'
const { validateRequirementDefinition, assertCondition, validateUploadedFile } = await import('../../../src/platform/documents/document-requirement.service.js')

describe('platform document requirements capability', () => {
  const fieldKeys = new Set(['category', 'amount'])
  it('normalizes and deduplicates file types', () => { const result = validateRequirementDefinition({ name: 'ID', documentTypeId: 'doc-1', allowedFileTypes: ['PDF', '.pdf', 'image/*'], maxSizeBytes: 1024 }, fieldKeys); expect(result.allowedFileTypes).toEqual(['.pdf', 'image/*']) })
  it('rejects unsafe or unbounded file limits', () => expect(() => validateRequirementDefinition({ name: 'ID', documentTypeId: 'doc-1', allowedFileTypes: ['application/pdf'], maxSizeBytes: 1024 * 1024 * 1024 + 1 }, fieldKeys)).toThrow())
  it('rejects unknown conditional fields', () => expect(() => assertCondition({ field: 'missing', operator: 'equals', value: true }, fieldKeys)).toThrow())
  it('rejects empty logical condition groups', () => expect(() => assertCondition({ all: [] }, fieldKeys)).toThrow())
  it('rejects excessive condition nesting', () => { let condition = { field: 'amount', operator: 'exists' }; for (let i = 0; i < 10; i++) condition = { not: condition }; expect(() => assertCondition(condition, fieldKeys)).toThrow() })
  it('validates file MIME, extension and size', () => { const requirement = { allowedFileTypes: ['application/pdf', '.jpg', 'image/*'], maxSizeBytes: 10_000 }; expect(validateUploadedFile({ requirement, mimeType: 'application/pdf', extension: '.pdf', sizeBytes: 500 })).toBe(true); expect(() => validateUploadedFile({ requirement, mimeType: 'application/zip', extension: '.zip', sizeBytes: 500 })).toThrow(); expect(() => validateUploadedFile({ requirement, mimeType: 'application/pdf', extension: '.pdf', sizeBytes: 10_001 })).toThrow() })
})
