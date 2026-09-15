import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  DOCUMENT_MODULE,
  DOCUMENT_ACTIONS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from '../../../src/features/documents/document.constants.js'

const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'express-document-storage-'))
const { createLocalStorageAdapter } = await import('../../../src/infrastructure/storage/local.storage.js')
const { createStorageKey } = await import('../../../src/platform/storage/storage.key.js')
const storage = createLocalStorageAdapter({ root: storageRoot })

afterEach(async () => {
  await fs.rm(storageRoot, { recursive: true, force: true })
  await fs.mkdir(storageRoot, { recursive: true })
})

describe('document constants', () => {
  it('defines the reusable documents permission surface', () => {
    expect(DOCUMENT_MODULE).toBe('documents')
    expect(DOCUMENT_ACTIONS).toEqual({ READ: 'read', UPLOAD: 'upload', DELETE: 'delete' })
  })
  it('uses a conservative default upload limit', () => expect(DEFAULT_MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024))
})

describe('local document storage', () => {
  it('writes and reads binary content using a generated storage key', async () => { const key = createStorageKey('permit.pdf'); const content = Buffer.from('document-content'); await storage.put({ key, body: content, contentType: 'application/pdf' }); await expect(storage.get({ key })).resolves.toEqual({ key, body: content }) })
  it('deletes stored content', async () => { const key = createStorageKey('photo.jpg'); await storage.put({ key, body: Buffer.from('image'), contentType: 'image/jpeg' }); await storage.delete({ key }); await expect(storage.get({ key })).rejects.toThrow() })
})
