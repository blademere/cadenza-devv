const fs = require("fs/promises")
const path = require("path")
const crypto = require("crypto")

const root = path.resolve(process.env.DOCUMENT_STORAGE_DIR || "./storage/documents")

const ensureRoot = async () => {
  await fs.mkdir(root, { recursive: true })
}

const putObject = async ({ key, buffer }) => {
  const filePath = path.resolve(root, key)
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key.")
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buffer, { flag: "wx" })
  return { provider: "local", key }
}

const getObject = async (key) => {
  const filePath = path.resolve(root, key)
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key.")
  }
  return fs.readFile(filePath)
}

const deleteObject = async (key) => {
  const filePath = path.resolve(root, key)
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key.")
  }
  await fs.rm(filePath, { force: true })
}

const createStorageKey = (originalName) => {
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "")
  return `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`
}

module.exports = {
  ensureRoot,
  putObject,
  getObject,
  deleteObject,
  createStorageKey,
}
