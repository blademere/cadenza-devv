const { describe, expect, it, vi } = await import("vitest")
const { createStorageService } = require("../../../../src/platform/storage/storage.service")

describe("storage service", () => {
  it("delegates supported operations to the adapter", async () => {
    const adapter = {
      put: vi.fn().mockResolvedValue({ key: "a.txt" }),
      get: vi.fn().mockResolvedValue({ key: "a.txt" }),
      delete: vi.fn().mockResolvedValue({ key: "a.txt" }),
      head: vi.fn().mockResolvedValue({ key: "a.txt" }),
      copy: vi.fn().mockResolvedValue({ key: "b.txt" }),
      getSignedUrl: vi.fn().mockResolvedValue("signed://a.txt"),
    }
    const storage = createStorageService(adapter)

    await expect(storage.put({ key: "a.txt", body: "hello" })).resolves.toEqual({ key: "a.txt" })
    await expect(storage.get({ key: "a.txt" })).resolves.toEqual({ key: "a.txt" })
    await expect(storage.delete({ key: "a.txt" })).resolves.toEqual({ key: "a.txt" })
    await expect(storage.head({ key: "a.txt" })).resolves.toEqual({ key: "a.txt" })
    await expect(storage.copy({ sourceKey: "a.txt", destinationKey: "b.txt" })).resolves.toEqual({ key: "b.txt" })
    await expect(storage.getSignedUrl({ key: "a.txt" })).resolves.toBe("signed://a.txt")
  })

  it("rejects an incomplete adapter", () => {
    expect(() => createStorageService({})).toThrow("storage adapter")
  })
})
