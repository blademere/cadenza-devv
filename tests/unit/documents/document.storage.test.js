import { afterEach, describe, expect, it } from "vitest"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "express-document-storage-"))
const { createLocalStorageAdapter } = await import("../../../src/infrastructure/storage/local.storage.js")
const { createStorageKey } = await import("../../../src/platform/storage/storage.key.js")
const storage = createLocalStorageAdapter({ root: storageRoot })

afterEach(async () => {
  await fs.rm(storageRoot, { recursive: true, force: true })
  await fs.mkdir(storageRoot, { recursive: true })
})

describe("local document storage", () => {
  it("writes and reads binary content using a generated storage key", async () => {
    const key = createStorageKey("permit.pdf")
    const content = Buffer.from("document-content")

    await storage.put({ key, body: content, contentType: "application/pdf" })
    await expect(storage.get({ key })).resolves.toEqual({ key, body: content })
  })

  it("deletes stored content", async () => {
    const key = createStorageKey("photo.jpg")
    await storage.put({ key, body: Buffer.from("image"), contentType: "image/jpeg" })

    await storage.delete({ key })
    await expect(storage.get({ key })).rejects.toThrow()
  })
})
