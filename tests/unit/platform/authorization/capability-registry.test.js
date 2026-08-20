const { describe, expect, it } = require('vitest')
const { getCapabilityRegistry } = require('../../../../src/platform/authorization/capability-registry')

describe('capability registry', () => {
  it('defines unique capability keys with valid module and permission bindings', () => {
    const capabilities = getCapabilityRegistry()
    const keys = capabilities.map((capability) => capability.key)

    expect(new Set(keys).size).toBe(keys.length)

    for (const capability of capabilities) {
      expect(capability.moduleKey).toMatch(/^[a-z0-9_-]+$/)
      expect(capability.route).toMatch(/^\//)
      expect(capability.permission).toMatch(/^[a-z0-9_-]+:[a-z0-9_-]+$/)
    }
  })
})
