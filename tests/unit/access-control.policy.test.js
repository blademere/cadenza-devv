import { describe, expect, it } from 'vitest'
const {
  ownershipPolicy,
  anyPolicy,
  evaluatePolicy,
} = require('../../src/features/access-control/access-control.policy')

describe('access-control policies', () => {
  it('allows ownership when user owns the resource', () => {
    expect(ownershipPolicy({ userId: 10, ownerId: 10 })).toBe(true)
  })

  it('denies ownership when user does not own the resource', () => {
    expect(ownershipPolicy({ userId: 10, ownerId: 20 })).toBe(false)
  })

  it('supports an explicit any-resource policy', () => {
    expect(anyPolicy()).toBe(true)
  })

  it('evaluates asynchronous policies', async () => {
    const policy = async ({ user, resource }) => {
      return user.id === resource.ownerId
    }

    await expect(
      evaluatePolicy({
        policy,
        user: { id: 10 },
        resource: { ownerId: 10 },
      }),
    ).resolves.toBe(true)
  })
})
