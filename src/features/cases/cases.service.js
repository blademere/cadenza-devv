const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const {
  normalizePagination,
  createPaginationMeta,
} = require('../../common/pagination/pagination')
const {
  createCase,
  findCaseById,
  findCaseTypeById,
  listCases,
  countCases,
  transitionCase,
} = require('./cases.repository')

const create = async (data) => {
  if (!data.caseNumber || !data.caseTypeId || !data.title?.trim()) {
    throw new BadRequestError('caseNumber, caseTypeId, and title are required.')
  }
  const caseType = await findCaseTypeById(data.caseTypeId)
  if (!caseType || !caseType.isActive) {
    throw new NotFoundError('Active case type not found.')
  }
  return createCase({ ...data, title: data.title.trim() })
}

const getById = async (id) => {
  const record = await findCaseById(id)
  if (!record) throw new NotFoundError('Case not found.')
  return record
}

const list = async (query = {}) => {
  const pagination = normalizePagination(query)
  const where = {
    ...(query.caseTypeId ? { caseTypeId: query.caseTypeId } : {}),
    ...(query.status ? { status: query.status } : {}),
  }
  const [cases, total] = await Promise.all([
    listCases({ skip: pagination.skip, take: pagination.take, where }),
    countCases(where),
  ])
  return {
    data: cases,
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  }
}

const transition = async ({ id, toStatus, changedByUserId, reason, metadata }) => {
  if (!toStatus?.trim()) throw new BadRequestError('toStatus is required.')
  const current = await getById(id)
  if (current.status === toStatus) {
    throw new BadRequestError('Case is already in the requested status.')
  }
  const updated = await transitionCase(
    id,
    current.status,
    toStatus.trim(),
    changedByUserId,
    reason,
    metadata,
  )
  if (!updated) throw new NotFoundError('Case not found.')
  return updated
}

module.exports = { create, getById, list, transition }
