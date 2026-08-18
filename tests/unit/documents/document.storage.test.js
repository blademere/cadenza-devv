import { afterEach, describe, expect, it } from "vitest"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "express-document-storage-"))
process.env.DOCUMENT_STORAGE_DIR = storageRoot

const storage = await import("../../../src/infrastructure/storage/local.js")

afterEach(async () => {
  await fs.rm(storageRoot, { recursive: true, force: true })
  await fs.mkdir(storageRoot, { recursive: true })
})

describe("local document storage", () => {
  it("writes and reads binary content using a generated storage key", async () => {
    const key = storage.createStorageKey("permit.pdf")
    const content = Buffer.from("document-content")

    await storage.putObject({ key, buffer: content })
    await expect(storage.getObject(key)).resolves.toEqual(content)
  })

  it("deletes stored content", async () => {
    const key = storage.createStorageKey("photo.jpg")
    await storage.putObject({ key, buffer: Buffer.from("image") })

    await storage.deleteObject(key)
    await expect(storage.getObject(key)).rejects.toThrow()
  })
})
