import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  normalizePagination,
  createPaginationMeta,
} from '../../common/pagination/pagination.js'
import {
  createCaseType,
  createCase,
  findCaseById,
  findCaseTypeById,
  listCases,
  countCases,
  transitionCase,
} from './cases.repository.js'
import { CASE_STATUS } from './cases.constants.js'

const createType = async (data) => {
  if (!data.key?.trim() || !data.name?.trim()) {
    throw new BadRequestError('key and name are required.')
  }
  return createCaseType({
    ...data,
    key: data.key.trim(),
    name: data.name.trim(),
  })
}

const createRecord = async (data) => {
  if (!data.caseNumber?.trim() || !data.caseTypeId || !data.title?.trim()) {
    throw new BadRequestError('caseNumber, caseTypeId, and title are required.')
  }
  const caseType = await findCaseTypeById(data.caseTypeId)
  if (!caseType || !caseType.isActive) {
    throw new NotFoundError('Active case type not found.')
  }
  return createCase({
    ...data,
    caseNumber: data.caseNumber.trim(),
    title: data.title.trim(),
    status: data.status?.trim() || CASE_STATUS.DRAFT,
  })
}

const getById = async (id, options = {}) => {
  const record = await findCaseById(id, options)
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

const transition = async ({
  id,
  toStatus,
  changedByUserId,
  reason,
  metadata,
}) => {
  if (!toStatus?.trim()) throw new BadRequestError('toStatus is required.')
  const current = await getById(id, { includeDetails: false })
  const normalizedStatus = toStatus.trim()
  if (current.status === normalizedStatus) {
    throw new BadRequestError('Case is already in the requested status.')
  }
  const updated = await transitionCase(
    id,
    current.status,
    normalizedStatus,
    changedByUserId,
    reason,
    metadata
  )
  if (!updated)
    throw new ConflictError(
      'Case status changed before this transition could be completed.'
    )
  return updated
}

export { createType, createRecord, getById, list, transition }
