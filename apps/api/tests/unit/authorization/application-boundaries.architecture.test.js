import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(__dirname, '../../../..')
const srcRoot = path.join(apiRoot, 'src')

const readJavaScriptFiles = (directory) => {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return readJavaScriptFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : []
  })
}

const relativeSource = (filePath) => path.relative(srcRoot, filePath).replaceAll(path.sep, '/')
const source = (filePath) => fs.readFileSync(filePath, 'utf8')

const applicationFiles = readJavaScriptFiles(path.join(srcRoot, 'apps'))
const platformFiles = readJavaScriptFiles(path.join(srcRoot, 'platform'))

const forbiddenApplicationImports = [
  /(?:\.\.?\/)+features\/authorization(?:[/'"]|$)/,
  /(?:\.\.?\/)+features\/authorization-admin(?:[/'"]|$)/,
]

const forbiddenPlatformImports = [
  /(?:\.\.?\/)+apps(?:[/'"]|$)/,
]

const forbiddenPlatformOBOKnowledge = [
  /obo_/i,
  /OBO/i,
]

describe('application authorization dependency boundaries', () => {
  test('applications do not import legacy global authorization implementations', () => {
    const violations = applicationFiles.flatMap((filePath) => {
      const contents = source(filePath)
      return forbiddenApplicationImports
        .filter((pattern) => pattern.test(contents))
        .map((pattern) => `${relativeSource(filePath)} matches ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  test('applications do not import another application implementation', () => {
    const appNames = fs.existsSync(path.join(srcRoot, 'apps'))
      ? fs.readdirSync(path.join(srcRoot, 'apps'), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : []

    const violations = applicationFiles.flatMap((filePath) => {
      const contents = source(filePath)
      return appNames.flatMap((appName) => {
        const ownApp = relativeSource(filePath).split('/')[1]
        if (appName === ownApp) return []

        const pattern = new RegExp(`(?:\\.\\.?/)+apps/${appName}(?:[/\\'"]|$)`)
        return pattern.test(contents) ? [`${relativeSource(filePath)} imports apps/${appName}`] : []
      })
    })

    expect(violations).toEqual([])
  })

  test('platform does not depend on application implementations', () => {
    const violations = platformFiles.flatMap((filePath) => {
      const contents = source(filePath)
      return forbiddenPlatformImports
        .filter((pattern) => pattern.test(contents))
        .map((pattern) => `${relativeSource(filePath)} matches ${pattern}`)
    })

    expect(violations).toEqual([])
  })

  test('platform authorization remains OBO-agnostic', () => {
    const authorizationFiles = platformFiles.filter((filePath) => relativeSource(filePath).startsWith('platform/authorization/'))
    const violations = authorizationFiles.flatMap((filePath) => {
      const contents = source(filePath)
      return forbiddenPlatformOBOKnowledge
        .filter((pattern) => pattern.test(contents))
        .map((pattern) => `${relativeSource(filePath)} contains application-specific OBO knowledge`)
    })

    expect(violations).toEqual([])
  })

  test('each application authorization module uses Platform authorization primitives', () => {
    const appNames = fs.existsSync(path.join(srcRoot, 'apps'))
      ? fs.readdirSync(path.join(srcRoot, 'apps'), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : []

    for (const appName of appNames) {
      const authorizationDirectory = path.join(srcRoot, 'apps', appName, 'authorization')
      if (!fs.existsSync(authorizationDirectory)) continue

      const files = readJavaScriptFiles(authorizationDirectory)
      expect(files.length).toBeGreaterThan(0)

      const contents = files.map(source).join('\n')
      expect(contents).toMatch(/platform\/authorization\//)
    }
  })

  test('OBO authorization exposes only its declared resource vocabulary', async () => {
    const { OBO_RESOURCES, assertOBOResource } = await import('../../../src/apps/obo/authorization/authorization.service.js')

    expect(OBO_RESOURCES).toContain('obo_authorization')
    expect(OBO_RESOURCES).toContain('obo_plan_permits')
    expect(() => assertOBOResource('authorization')).toThrow(/Unsupported OBO authorization resource/)
    expect(() => assertOBOResource('users')).toThrow(/Unsupported OBO authorization resource/)
    expect(() => assertOBOResource('cadenza_records')).toThrow(/Unsupported OBO authorization resource/)

    for (const resource of OBO_RESOURCES) expect(assertOBOResource(resource)).toBe(resource)
  })
})
