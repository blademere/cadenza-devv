import { describe, expect, it, vi } from 'vitest'

const {
  normalizeSearchRequest,
  createSearchService,
} = require('../../../../src/platform/search/search.service')
const {
  createSearchProvider,
  normalizeResult,
} = require('../../../../src/platform/search/search.provider')
const { SearchProviderError } = require('../../../../src/platform/search/search.errors')

describe('generic search abstraction', () => {
  it('normalizes query, filters, sort, and pagination', () => {
    expect(
      normalizeSearchRequest({
        query: '  permit  ',
        filters: { status: 'ACTIVE' },
        sort: [{ field: 'createdAt', direction: 'desc' }],
        pagination: { page: '2', limit: '25' },
      }),
    ).toEqual({
      query: 'permit',
      filters: { status: 'ACTIVE' },
      sort: [{ field: 'createdAt', direction: 'desc' }],
      pagination: { page: 2, limit: 25, skip: 25, take: 25 },
    })
  })

  it('normalizes provider results', () => {
    expect(normalizeResult({ items: [{ id: 1 }], total: 1 })).toEqual({
      items: [{ id: 1 }],
      total: 1,
      page: null,
      limit: null,
      facets: {},
      meta: {},
    })
  })

  it('rejects an invalid provider', () => {
    expect(() => createSearchProvider(null)).toThrow(TypeError)
  })

  it('wraps provider failures in SearchProviderError', async () => {
    const provider = createSearchProvider({
      search: vi.fn().mockRejectedValue(new Error('backend unavailable')),
    })

    await expect(provider.search()).rejects.toBeInstanceOf(SearchProviderError)
  })

  it('passes normalized search parameters to the provider', async () => {
    const search = vi.fn().mockResolvedValue({ items: [], total: 0 })
    const service = createSearchService({ provider: { search } })

    const result = await service.search({
      query: 'users',
      filters: { active: true },
      sort: [{ field: 'createdAt', direction: 'desc' }],
      pagination: { page: 3, limit: 10 },
    })

    expect(search).toHaveBeenCalledWith({
      query: 'users',
      filters: { active: true },
      sort: [{ field: 'createdAt', direction: 'desc' }],
      pagination: { page: 3, limit: 10, skip: 20, take: 10 },
    })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })
})
