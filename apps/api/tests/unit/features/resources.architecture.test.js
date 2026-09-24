import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const featureRoot = path.resolve(process.cwd(), 'src/features/resources')

const readFeatureFile = (name) =>
  fs.readFileSync(path.join(featureRoot, name), 'utf8')

describe('resources architecture', () => {
  it('contains only the intended reusable capability layers', () => {
    expect(fs.readdirSync(featureRoot).sort()).toEqual([
      'resource.constants.js',
      'resource.mapper.js',
      'resource.repository.js',
      'resource.service.js',
    ])
  })

  it('does not depend on application modules', () => {
    for (const name of fs.readdirSync(featureRoot)) {
      if (!name.endsWith('.js')) continue
      const source = readFeatureFile(name)
      expect(source).not.toMatch(/(?:\.\.\/)+apps\//)
    }
  })

  it('does not introduce resource HTTP or scheduling layers', () => {
    const forbidden = [
      'resource.controller.js',
      'resource.routes.js',
      'resource.validation.js',
      'resource.policy.js',
      'resource.middleware.js',
      'resource.cache.js',
      'resource.slot.service.js',
    ]

    for (const name of forbidden) {
      expect(fs.existsSync(path.join(featureRoot, name))).toBe(false)
    }
  })
})
