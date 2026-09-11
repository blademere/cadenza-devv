import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('Phase 11 platform configuration contracts', () => {
  it('defines generic platform configuration namespaces and keys', () => {
    const source = read('src/platform/configuration/configuration.constants.js')

    expect(source).toContain("SYSTEM: 'system'")
    expect(source).toContain("OPERATIONAL: 'operational'")
    expect(source).toContain("PLATFORM: 'platform'")
    expect(source).toContain("'authorization.cache.enabled'")
    expect(source).toContain("'authorization.cache.trustPositive'")
  })

  it('exposes configuration through the platform boundary', () => {
    const source = read('src/platform/configuration/configuration.service.js')

    expect(source).toContain("from '../../config/env.js'")
    expect(source).toContain('export const getConfiguration')
    expect(source).toContain('export const requireConfiguration')
    expect(source).toContain('export const getPlatformConfiguration')
    expect(source).toContain('Object.hasOwn(PLATFORM_VALUES, key)')
  })

  it('keeps platform configuration domain-neutral', () => {
    const source = read('src/platform/configuration/configuration.constants.js')

    expect(source).not.toMatch(/permit|obo|professional|receiving|inspection/i)
  })

  it('does not bypass the configuration boundary from authorization', () => {
    const source = read('src/platform/authorization/access-control.service.js')

    expect(source).toContain("from '../configuration/configuration.service.js'")
    expect(source).not.toContain('process.env.AUTHORIZATION_CACHE_ENABLED')
    expect(source).not.toContain('process.env.AUTHORIZATION_CACHE_TRUST_POSITIVE')
  })
})
