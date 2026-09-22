import crypto from 'node:crypto'

function sanitizeFileName(fileName) {
  const name = String(fileName || '').trim()
  if (!name || name.length > 255) throw new Error('A valid file name is required')
  return name.replace(/[\\/\0]/g, '_')
}

function createStorageKey(fileName, prefix = 'documents') {
  const safeName = sanitizeFileName(fileName)
  const token = crypto.randomUUID()
  return `${prefix}/${token}-${safeName}`
}

function normalizeStorageKey(key) {
  const normalized = String(key || '').replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error('Invalid storage key')
  }
  return normalized
}

export { sanitizeFileName, createStorageKey, normalizeStorageKey }
