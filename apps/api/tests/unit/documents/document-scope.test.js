import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOwnedDocument: vi.fn(),
  listOwnedDocuments: vi.fn(),
}))

vi.mock('../../../src/features/documents/document.repository.js', () => ({
  findOwnedDocument: mocks.findOwnedDocument,
  listOwnedDocuments: mocks.listOwnedDocuments,
  findDocumentTypeById: vi.fn(),
  createDocument: vi.fn(),
  softDeleteDocument: vi.fn(),
}))

const service = await import('../../../src/features/documents/document.service.js')

describe('document application scope', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes the application scope to owned-document lookups', async () => {
    const document = { id: 'doc-1', appId: 'obo-app', ownerId: 10 }
    mocks.findOwnedDocument.mockResolvedValue(document)

    await expect(service.getOwnedDocument({ userId: 10, id: 'doc-1', appId: 'obo-app' })).resolves.toEqual(document)
    expect(mocks.findOwnedDocument).toHaveBeenCalledWith({ userId: 10, id: 'doc-1', appId: 'obo-app' })
  })

  it('passes the application scope to document lists', async () => {
    mocks.listOwnedDocuments.mockResolvedValue([])

    await expect(service.listMyDocuments({ userId: 10, appId: 'obo-app' })).resolves.toEqual([])
    expect(mocks.listOwnedDocuments).toHaveBeenCalledWith({ userId: 10, appId: 'obo-app' })
  })

  it('preserves global/shared document access when no application scope is supplied', async () => {
    const document = { id: 'doc-1', appId: null, ownerId: 10 }
    mocks.findOwnedDocument.mockResolvedValue(document)

    await expect(service.getOwnedDocument({ userId: 10, id: 'doc-1' })).resolves.toEqual(document)
    expect(mocks.findOwnedDocument).toHaveBeenCalledWith({ userId: 10, id: 'doc-1', appId: null })
  })
})
