import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/actors/actor.repository.js', () => ({
  list: vi.fn(),
  findByUserId: vi.fn(),
}))

const actorRepository = await import('../../../src/apps/cadenza/actors/actor.repository.js')
const actorService = await import('../../../src/apps/cadenza/actors/actor.service.js')

describe('Cadenza actor directory', () => {
  it('returns one unified actor record with pagination', async () => {
    actorRepository.list.mockResolvedValue({
      actors: [{ id: 42, email: 'ana@example.com', actorTypes: ['CUSTOMER', 'INSTRUCTOR'], roleNames: ['cadenza_client', 'cadenza_instructor'] }],
      total: 1,
    })

    const result = await actorService.list({
      appId: '550e8400-e29b-41d4-a716-446655440000',
      query: { page: '1', limit: '25', search: 'ana' },
    })

    expect(result.data[0].actorTypes).toEqual(['CUSTOMER', 'INSTRUCTOR'])
    expect(result.data[0].roleNames).toContain('cadenza_instructor')
    expect(result.pagination).toMatchObject({ page: 1, limit: 25, total: 1 })
    expect(actorRepository.list).toHaveBeenCalledWith(expect.objectContaining({
      search: 'ana',
      skip: 0,
      take: 25,
    }))
  })
})
