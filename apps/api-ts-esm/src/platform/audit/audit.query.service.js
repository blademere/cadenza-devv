const prisma = require('../../infrastructure/database/prisma')
const {
  normalizePagination,
  createPaginationMeta,
  createOrderBy,
} = require('../../common/pagination/pagination')

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

const buildAuditWhere = ({ entityType, entityId, actorId, action, from, to } = {}) => {
  const where = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = String(entityId)
  if (action) where.action = action

  const parsedActorId = parseOptionalInt(actorId)
  if (parsedActorId) where.actorId = parsedActorId

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

const listAuditLogs = async ({
  page,
  limit,
  sortBy,
  sortOrder,
  entityType,
  entityId,
  actorId,
  action,
  from,
  to,
} = {}, db = prisma) => {
  const pagination = normalizePagination({ page, limit })
  const where = buildAuditWhere({ entityType, entityId, actorId, action, from, to })
  const orderBy = createOrderBy(
    { sortBy, sortOrder },
    ['createdAt', 'action', 'entityType'],
    'createdAt',
  )

  const [data, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        actor: {
          select: { id: true, email: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ])

  return {
    data,
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  }
}

const getEntityTimeline = async ({ entityType, entityId, ...query } = {}, db = prisma) => {
  return listAuditLogs({
    ...query,
    entityType,
    entityId,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  }, db)
}

module.exports = {
  buildAuditWhere,
  listAuditLogs,
  getEntityTimeline,
}
