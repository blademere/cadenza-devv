const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

const normalizePagination = ({ page, limit } = {}) => {
  const normalizedLimit = parsePositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT)
  const normalizedPage = parsePositiveInteger(page, DEFAULT_PAGE)

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  }
}

const createPaginationMeta = ({ page, limit, total }) => {
  const normalizedTotal = Math.max(0, Number(total) || 0)
  const pages = normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / limit)

  return {
    page,
    limit,
    total: normalizedTotal,
    pages,
    hasNextPage: page < pages,
    hasPreviousPage: page > 1 && pages > 0,
  }
}

const createOrderBy = ({ sortBy, sortOrder }, allowedSortFields, fallbackField) => {
  const field = allowedSortFields.includes(sortBy) ? sortBy : fallbackField
  const direction = String(sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
  return { [field]: direction }
}

const pickFilters = (query = {}, allowedFilters = []) => {
  return Object.fromEntries(
    allowedFilters
      .filter((field) => query[field] !== undefined && query[field] !== '')
      .map((field) => [field, query[field]]),
  )
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
  pickFilters,
}
