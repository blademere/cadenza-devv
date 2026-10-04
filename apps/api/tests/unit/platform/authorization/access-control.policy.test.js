import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '../../../../src/common/errors/appError.js'
import { assertPolicy, evaluatePolicy, ownershipPolicy } from '../../../../src/platform/authorization/authorization.policy.js'

describe('authorization policy primitives', () => {
  it('allows ownership when the authenticated user owns the resource', () => {
    expect(ownershipPolicy({ user: { id: 10, ownerId: 10 }, resource: {} })).toBe(true)
  })

  it('denies ownership when the authenticated user does not own the resource', () => {
    expect(ownershipPolicy({ user: { id: 10, ownerId: 11 }, resource: {} })).toBe(false)
  })

  it('evaluates synchronous and asynchronous policies', async () => {
    expect(await evaluatePolicy({ policy: () => true, user: {}, resource: {} })).toBe(true)
    expect(await evaluatePolicy({ policy: async () => false, user: {}, resource: {} })).toBe(false)
  })

  it('rejects non-function policies', async () => {
    await expect(evaluatePolicy({ policy: null, user: {}, resource: {} })).rejects.toThrow(TypeError)
  })

  it('asserts an allowed policy', async () => {
    await expect(assertPolicy({ policy: () => true, user: {}, resource: {} })).resolves.toBeUndefined()
  })

  it('throws ForbiddenError when a policy denies access', async () => {
    await expect(assertPolicy({ policy: () => false, user: {}, resource: {} })).rejects.toBeInstanceOf(ForbiddenError)
  })
})
