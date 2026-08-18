const { describe, expect, it } = require("vitest")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { createLocalStorageAdapter } = require("../../../src/infrastructure/storage/local.storage")

describe("local storage adapter", () => {
  it("stores, reads, copies, inspects, and deletes objects", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "express-storage-"))
    const storage = createLocalStorageAdapter({ root })

    await storage.put({ key: "documents/a.txt", body: "hello", contentType: "text/plain" })
    await expect(storage.get({ key: "documents/a.txt" })).resolves.toMatchObject({ key: "documents/a.txt" })
    await expect(storage.head({ key: "documents/a.txt" })).resolves.toMatchObject({ size: 5 })
    await storage.copy({ sourceKey: "documents/a.txt", destinationKey: "documents/b.txt" })
    await storage.delete({ key: "documents/a.txt" })
    await expect(storage.head({ key: "documents/a.txt" })).rejects.toThrow()

    await fs.rm(root, { recursive: true, force: true })
  })

  it("rejects traversal keys", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "express-storage-"))
    const storage = createLocalStorageAdapter({ root })

    await expect(storage.put({ key: "../outside.txt", body: "nope" })).rejects.toThrow("Invalid storage key")
    await fs.rm(root, { recursive: true, force: true })
  })
})
