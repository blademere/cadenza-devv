import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const { CONFIGURATION_STATUS, assertTransition, assertMutable, assertPublishable, assertRollbackTarget } = await import('../../../src/platform/configuration/configuration-lifecycle.service.js')
const root = path.resolve(process.cwd())
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('configuration capability', () => {
  it('allows only the intended forward lifecycle', () => { expect(() => assertTransition('DRAFT', 'VALIDATED')).not.toThrow(); expect(() => assertTransition('VALIDATED', 'PUBLISHED')).not.toThrow(); expect(() => assertTransition('PUBLISHED', 'ARCHIVED')).not.toThrow() })
  it('rejects skipping validation', () => expect(() => assertTransition('DRAFT', 'PUBLISHED')).toThrow())
  it('rejects publishing a draft directly', () => { expect(() => assertPublishable('DRAFT')).toThrow(); expect(() => assertPublishable('VALIDATED')).not.toThrow() })
  it('allows validated configurations to be returned to draft', () => expect(() => assertTransition('VALIDATED', 'DRAFT')).not.toThrow())
  it('treats published and archived content as immutable', () => { expect(() => assertMutable(CONFIGURATION_STATUS.PUBLISHED)).toThrow(); expect(() => assertMutable(CONFIGURATION_STATUS.ARCHIVED)).toThrow(); expect(() => assertMutable(CONFIGURATION_STATUS.DRAFT)).not.toThrow(); expect(() => assertMutable(CONFIGURATION_STATUS.VALIDATED)).not.toThrow() })
  it('only permits archived versions as rollback targets', () => { expect(() => assertRollbackTarget('ARCHIVED')).not.toThrow(); expect(() => assertRollbackTarget('PUBLISHED')).toThrow(); expect(() => assertRollbackTarget('DRAFT')).toThrow() })
  it('rejects unknown states', () => { expect(() => assertTransition('DRAFT', 'BROKEN')).toThrow(); expect(() => assertMutable('BROKEN')).toThrow() })
  it('defines generic platform configuration namespaces and keys', () => { const source = read('src/platform/configuration/configuration.constants.js'); expect(source).toContain("SYSTEM: 'system'"); expect(source).toContain("OPERATIONAL: 'operational'"); expect(source).toContain("PLATFORM: 'platform'"); expect(source).toContain("'authorization.cache.enabled'"); expect(source).toContain("'authorization.cache.trustPositive'") })
  it('exposes configuration through the platform boundary', () => { const source = read('src/platform/configuration/configuration.service.js'); expect(source).toContain("from '../../config/env.js'"); expect(source).toContain('export const getConfiguration'); expect(source).toContain('export const requireConfiguration'); expect(source).toContain('export const getPlatformConfiguration'); expect(source).toContain('Object.hasOwn(PLATFORM_VALUES, key)') })
  it('keeps platform configuration domain-neutral', () => expect(read('src/platform/configuration/configuration.constants.js')).not.toMatch(/permit|obo|professional|receiving|inspection/i))
  it('does not bypass the configuration boundary from authorization', () => { const source = read('src/platform/authorization/access-control.service.js'); expect(source).toContain("from '../configuration/configuration.service.js'"); expect(source).not.toContain('process.env.AUTHORIZATION_CACHE_ENABLED'); expect(source).not.toContain('process.env.AUTHORIZATION_CACHE_TRUST_POSITIVE') })
})
