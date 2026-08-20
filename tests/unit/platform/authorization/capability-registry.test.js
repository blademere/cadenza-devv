const { describe, expect, it } = require('vitest')
const { getCapabilityRegistry } = require('../../../../../src/platform/authorization/capability-registry')

describe('capability registry', () => {
  it('defines unique capability keys and permission bindings', () => {
    const capabilities = getCapabilityRegistry()
    const keys = capabilities.map((capability) => capability.key)
    const permissions = capabilities.map((capability) => capability.permission)

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(permissions).size).toBe(permissions.length)

    for (const capability of capabilities) {
      expect(capability.moduleKey).toBeTruthy()
      expect(capability.route).toMatch(/^\//)
      expect(capability.permission).toMatch(/^[a-z0-9_-]+:[a-z0-9_-]+$/)
    }
  })
})
