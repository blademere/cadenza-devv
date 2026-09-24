import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '../../../..')
const srcRoot = path.join(apiRoot, 'src')
const testsRoot = path.join(apiRoot, 'tests')

const readJavaScriptFiles = (directory) => {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return readJavaScriptFiles(entryPath)
    return entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name) ? [entryPath] : []
  })
}

const relativePath = (filePath) => path.relative(apiRoot, filePath).replaceAll(path.sep, '/')

const sourceFiles = [
  ...readJavaScriptFiles(srcRoot),
  ...readJavaScriptFiles(testsRoot),
].filter((filePath) => !filePath.endsWith('.architecture.test.js'))

const legacyPatterns = [
  /features\/authorization(?:[-/]|['"]|$)/,
  /features\/authorization-admin(?:[-/]|['"]|$)/,
  /features\/admin\/authorization(?:[-/]|['"]|$)/,
  /\bfindRoleByName\b/,
  /\bglobal\s+role\b/i,
  /\buser\.role\b/,
]

describe('legacy authorization reference contract', () => {
  it('contains no legacy global authorization references in API source or tests', () => {
    const violations = sourceFiles.flatMap((filePath) => {
      const contents = fs.readFileSync(filePath, 'utf8')

      return legacyPatterns
        .filter((pattern) => pattern.test(contents))
        .map((pattern) => `${relativePath(filePath)} matches ${pattern}`)
    })

    expect(violations).toEqual([])
  })
})
