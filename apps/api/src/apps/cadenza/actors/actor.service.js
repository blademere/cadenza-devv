import { NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { normalizePagination, createPaginationMeta } from '../../../common/pagination/pagination.js'
import * as repository from './actor.repository.js'

const list = async ({ appId, query = {} }) => {
  const app = requireAppId(appId)
  const pagination = normalizePagination(query)
  const result = await repository.list({
    appId: app,
    skip: pagination.skip,
    take: pagination.take,
    search: query.search?.trim() || undefined,
  })
  return {
    data: result.actors,
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
    }),
  }
}

const get = async ({ appId, userId }) => {
  const app = requireAppId(appId)
  const result = await repository.findByUserId(userId, app)
  if (!result) throw new NotFoundError('Cadenza actor not found.')
  return result
}

export { list, get }
