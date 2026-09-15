import {
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
} from '../../common/pagination/pagination.js'
import { getContext } from '../context/context.service.js'
import * as repository from './audit.query.repository.js'

const parseDate = (value) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const buildAuditWhere = ({ entityType, entityId, actorId, action, appId, from, to } = {}) => {
  const where = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = String(entityId)
  if (action) where.action = action
  const parsedActorId = parseOptionalInt(actorId)
  if (parsedActorId) where.actorId = parsedActorId
  const resolvedAppId = appId ?? getContext()?.appId ?? null
  if (resolvedAppId) where.appId = resolvedAppId
  const fromDate = parseDate(from)
  const toDate = parseDate(to)
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    }
  }
  return where
}

const listAuditLogs = async ({ page, limit, sortBy, sortOrder, entityType, entityId, actorId, action, appId, from, to } = {}, db) => {
  const pagination = normalizePagination({ page, limit })
  const where = buildAuditWhere({ entityType, entityId, actorId, action, appId, from, to })
  const orderBy = createOrderBy({ sortBy, sortOrder }, ['createdAt', 'action', 'entityType'], 'createdAt')
  const [data, total] = await repository.findPage({ where, orderBy, skip: pagination.skip, take: pagination.take }, db)
  return {
    data,
    pagination: createPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
  }
}

const getEntityTimeline = async ({ entityType, entityId, ...query } = {}, db) =>
  listAuditLogs({ ...query, entityType, entityId, sortBy: 'createdAt', sortOrder: 'asc' }, db)

export { buildAuditWhere, listAuditLogs, getEntityTimeline }
