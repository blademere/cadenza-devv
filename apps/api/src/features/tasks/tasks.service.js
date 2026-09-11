import { BadRequestError, NotFoundError } from '../../common/errors/appError.js'
import {
  createTask,
  findTaskById,
  findCase,
  listTasks,
  updateTask,
} from './tasks.repository.js'
import { TASK_STATUS } from './tasks.constants.js'

const create = async (data, { db } = {}) => {
  if (!data.title?.trim()) throw new BadRequestError('title is required.')
  if (data.caseId) {
    const caseRecord = await findCase(data.caseId, db)
    if (!caseRecord) throw new NotFoundError('Case not found.')
  }
  return createTask({ ...data, title: data.title.trim() }, db)
}

const getById = async (id, { db } = {}) => {
  const task = await findTaskById(id, db)
  if (!task) throw new NotFoundError('Task not found.')
  return task
}

const list = ({ caseId, assigneeUserId, status } = {}, { db } = {}) =>
  listTasks({
    ...(caseId ? { caseId } : {}),
    ...(assigneeUserId ? { assigneeUserId } : {}),
    ...(status ? { status } : {}),
  }, db)

const update = async (id, data, { db } = {}) => {
  await getById(id, { db })
  const next = { ...data }
  if (next.title !== undefined) {
    next.title = next.title.trim()
    if (!next.title) throw new BadRequestError('title cannot be empty.')
  }
  if (next.status === TASK_STATUS.DONE && next.completedAt === undefined) {
    next.completedAt = new Date()
  }
  if (next.status && next.status !== TASK_STATUS.DONE && next.completedAt === undefined) {
    next.completedAt = null
  }
  return updateTask(id, next, db)
}

export { create, getById, list, update }
