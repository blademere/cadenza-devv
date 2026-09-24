import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/lessons/lesson.repository.js', () => ({
  findPackage: vi.fn(),
  createAttachment: vi.fn(),
  findAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}))

vi.mock('../../../src/platform/storage/storage.registry.js', () => ({
  getStorageService: vi.fn(),
}))

vi.mock('../../../src/platform/authorization/authorization.service.js', () => ({
  can: vi.fn().mockResolvedValue(true),
}))

const repository = await import('../../../src/apps/cadenza/lessons/lesson.repository.js')
const storageRegistry = await import('../../../src/platform/storage/storage.registry.js')
const service = await import('../../../src/apps/cadenza/lessons/lesson.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const PACKAGE_ID = '550e8400-e29b-41d4-a716-446655440001'
const ATTACHMENT_ID = '550e8400-e29b-41d4-a716-446655440002'

describe('Cadenza lesson attachment storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageRegistry.getStorageService.mockReturnValue({
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    })
  })

  it('stores attachment content through the platform storage boundary', async () => {
    repository.findPackage.mockResolvedValue({ id: PACKAGE_ID, appId: APP_ID })
    repository.createAttachment.mockResolvedValue({ id: ATTACHMENT_ID })

    const result = await service.addAttachment({
      appId: APP_ID,
      lessonPackageId: PACKAGE_ID,
      actorId: 42,
      fileName: 'lesson.pdf',
      contentBase64: Buffer.from('lesson content').toString('base64'),
      contentType: 'application/pdf',
      type: 'LESSON_MATERIAL',
      metadata: { session: 1 },
    })

    expect(result).toEqual({ id: ATTACHMENT_ID })
    const storage = storageRegistry.getStorageService.mock.results[0].value
    expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({
      contentType: 'application/pdf',
      metadata: expect.objectContaining({ application: 'cadenza', lessonPackageId: PACKAGE_ID }),
    }))
    expect(repository.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
      lessonPackageId: PACKAGE_ID,
      type: 'LESSON_MATERIAL',
      storageReference: expect.stringContaining(`cadenza/${APP_ID}/lesson-attachments/`),
    }))
  })

  it('rejects malformed base64 before writing to storage', async () => {
    repository.findPackage.mockResolvedValue({ id: PACKAGE_ID, appId: APP_ID })
    await expect(service.addAttachment({
      appId: APP_ID,
      lessonPackageId: PACKAGE_ID,
      fileName: 'lesson.pdf',
      contentBase64: 'not-base64!',
      contentType: 'application/pdf',
      type: 'LESSON_MATERIAL',
    })).rejects.toThrow('valid base64')
    expect(storageRegistry.getStorageService).not.toHaveBeenCalled()
  })

  it('rejects decoded content above the storage limit', async () => {
    repository.findPackage.mockResolvedValue({ id: PACKAGE_ID, appId: APP_ID })
    const contentBase64 = Buffer.alloc(950 * 1024 + 1).toString('base64')
    await expect(service.addAttachment({
      appId: APP_ID,
      lessonPackageId: PACKAGE_ID,
      fileName: 'lesson.pdf',
      contentBase64,
      contentType: 'application/pdf',
      type: 'LESSON_MATERIAL',
    })).rejects.toThrow('950 KB or smaller')
    expect(storageRegistry.getStorageService).not.toHaveBeenCalled()
  })

  it('removes the database record and then cleans up the stored object', async () => {
    repository.findAttachment.mockResolvedValue({
      id: ATTACHMENT_ID,
      storageReference: 'cadenza/test/lesson.pdf',
    })
    repository.deleteAttachment.mockResolvedValue({ count: 1 })

    await service.removeAttachment({
      appId: APP_ID,
      lessonPackageId: PACKAGE_ID,
      actorId: 42,
      id: ATTACHMENT_ID,
    })

    expect(repository.deleteAttachment).toHaveBeenCalledWith(ATTACHMENT_ID, PACKAGE_ID, APP_ID)
    const storage = storageRegistry.getStorageService.mock.results[0].value
    expect(storage.delete).toHaveBeenCalledWith({ key: 'cadenza/test/lesson.pdf' })
  })
})
