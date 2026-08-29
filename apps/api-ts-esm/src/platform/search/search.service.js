const { normalizePagination } = require('../../common/pagination/pagination')
const { createSearchProvider } = require('./search.provider')

const normalizeSearchRequest = ({ query = '', filters = {}, sort = [], pagination = {} } = {}) => {
  const normalizedSort = Array.isArray(sort) ? sort : []
  return {
    query: typeof query === 'string' ? query.trim() : '',
    filters: filters && typeof filters === 'object' ? filters : {},
    sort: normalizedSort,
    pagination: normalizePagination(pagination),
  }
}

const createSearchService = ({ provider }) => {
  const searchProvider = createSearchProvider(provider)

  return {
    async search(params = {}) {
      const normalized = normalizeSearchRequest(params)
      const result = await searchProvider.search(normalized)

      return {
        ...result,
        page: result.page ?? normalized.pagination.page,
        limit: result.limit ?? normalized.pagination.limit,
      }
    },
  }
}

module.exports = {
  normalizeSearchRequest,
  createSearchService,
}
