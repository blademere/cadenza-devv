const fs = require("node:fs/promises")
const path = require("node:path")
const crypto = require("node:crypto")
const { normalizeStorageKey } = require("../../platform/storage/storage.key")

function createLocalStorageAdapter({ root }) {
  if (!root) throw new Error("Storage root is required")

  function resolveKey(key) {
    return path.join(root, normalizeStorageKey(key))
  }

  async function put({ key, body, contentType, metadata = {} }) {
    const filePath = resolveKey(key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
    await fs.writeFile(filePath, buffer, { flag: "w" })
    return { key, size: buffer.length, contentType, metadata }
  }

  async function get({ key }) {
    const body = await fs.readFile(resolveKey(key))
    return { key, body }
  }

  async function head({ key }) {
    const stats = await fs.stat(resolveKey(key))
    return { key, size: stats.size, lastModified: stats.mtime }
  }

  async function remove({ key }) {
    await fs.rm(resolveKey(key), { force: true })
    return { key }
  }

  async function copy({ sourceKey, destinationKey }) {
    await fs.mkdir(path.dirname(resolveKey(destinationKey)), { recursive: true })
    await fs.copyFile(resolveKey(sourceKey), resolveKey(destinationKey))
    return { key: destinationKey }
  }

  async function getSignedUrl({ key }) {
    normalizeStorageKey(key)
    return `local://${encodeURIComponent(key)}?token=${crypto.randomBytes(16).toString("hex")}`
  }

  return { put, get, head, delete: remove, copy, getSignedUrl }
}

module.exports = { createLocalStorageAdapter }
