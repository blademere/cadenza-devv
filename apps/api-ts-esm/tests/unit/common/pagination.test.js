import { describe, expect, it } from 'vitest'

const {
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
  pickFilters,
} = require('../../../src/common/pagination/pagination')

describe('pagination helpers', () => {
  it('normalizes page and limit with safe defaults and maximum', () => {
    expect(normalizePagination({})).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    })

    expect(normalizePagination({ page: '3', limit: '500' })).toEqual({
      page: 3,
      limit: 100,
      skip: 200,
      take: 100,
    })
  })

  it('builds pagination metadata', () => {
    expect(createPaginationMeta({ page: 2, limit: 20, total: 45 })).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      pages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('whitelists sortable fields and sort direction', () => {
    expect(
      createOrderBy(
        { sortBy: 'email', sortOrder: 'asc' },
        ['createdAt', 'email'],
        'createdAt',
      ),
    ).toEqual({ email: 'asc' })

    expect(
      createOrderBy(
        { sortBy: 'passwordHash', sortOrder: 'invalid' },
        ['createdAt', 'email'],
        'createdAt',
      ),
    ).toEqual({ createdAt: 'desc' })
  })

  it('picks only explicitly allowed filters', () => {
    expect(
      pickFilters(
        { email: 'admin', isActive: 'true', passwordHash: 'secret' },
        ['email', 'isActive'],
      ),
    ).toEqual({ email: 'admin', isActive: 'true' })
  })
})
