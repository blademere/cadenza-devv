import crypto from 'node:crypto'
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
  findCaseTypeByKey,
  createCase,
  findCaseById,
  findCaseTypeById,
  listCases,
  countCases,
  transitionCase,
} from './cases.repository.js'
import { CASE_STATUS } from './cases.constants.js'

const generateCaseNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `CASE-${date}-${suffix}`
}

const createType = async (data, { db } = {}) => {
  if (!data.key?.trim() || !data.name?.trim()) throw new BadRequestError('key and name are required.')
  return createCaseType({ ...data, key: data.key.trim(), name: data.name.trim() }, db)
}

const getOrCreateType = async ({ key, name, description = null, isActive = true, db }) => {
  if (!key?.trim() || !name?.trim()) throw new BadRequestError('key and name are required.')
  const existing = await findCaseTypeByKey(key.trim(), db)
  if (existing) {
    if (!existing.isActive) throw new ConflictError('The requested case type is inactive.')
    return existing
  }
  return createType({ key: key.trim(), name: name.trim(), description, isActive }, { db })
}

const createRecord = async (data, { appId, db } = {}) => {
  if (!appId) throw new BadRequestError('appId is required.')
  if (!data.caseTypeId || !data.title?.trim()) throw new BadRequestError('caseTypeId and title are required.')
  const caseType = await findCaseTypeById(data.caseTypeId, db)
  if (!caseType || !caseType.isActive) throw new NotFoundError('Active case type not found.')
  return createCase({ ...data, appId, caseNumber: data.caseNumber?.trim() || generateCaseNumber(), title: data.title.trim(), status: data.status?.trim() || CASE_STATUS.DRAFT }, db)
}

const getById = async (id, { appId, db, includeDetails = true } = {}) => {
  if (!appId) throw new BadRequestError('appId is required.')
  const record = await findCaseById(id, { appId, db, includeDetails })
  if (!record) throw new NotFoundError('Case not found.')
  return record
}

const list = async (query = {}, { appId, db } = {}) => {
  if (!appId) throw new BadRequestError('appId is required.')
  const pagination = normalizePagination(query)
  const where = { ...(query.caseTypeId ? { caseTypeId: query.caseTypeId } : {}), ...(query.status ? { status: query.status } : {}) }
  const [cases, total] = await Promise.all([
    listCases({ skip: pagination.skip, take: pagination.take, where, appId }, db),
    countCases({ where, appId }, db),
  ])
  return { data: cases, pagination: createPaginationMeta({ page: pagination.page, limit: pagination.limit, total }) }
}

const transition = async ({ id, appId, toStatus, changedByUserId, reason, metadata, db }) => {
  if (!appId) throw new BadRequestError('appId is required.')
  if (!toStatus?.trim()) throw new BadRequestError('toStatus is required.')
  const current = await getById(id, { appId, db, includeDetails: false })
  const normalizedStatus = toStatus.trim()
  if (current.status === normalizedStatus) throw new BadRequestError('Case is already in the requested status.')
  const updated = await transitionCase(id, appId, current.status, normalizedStatus, changedByUserId, reason, metadata, db)
  if (!updated) throw new ConflictError('Case status changed before this transition could be completed.')
  return updated
}

export { generateCaseNumber, createType, getOrCreateType, createRecord, getById, list, transition }
