import { BadRequestError, NotFoundError } from '../../common/errors/appError.js'
import {
  createTask,
  findTaskById,
  findCase,
  listTasks,
  updateTask,
} from './tasks.repository.js'
import { TASK_STATUS } from './tasks.constants.js'

const create = async (data) => {
  if (!data.title?.trim()) throw new BadRequestError('title is required.')
  if (data.caseId) {
    const caseRecord = await findCase(data.caseId)
    if (!caseRecord) throw new NotFoundError('Case not found.')
  }
  return createTask({ ...data, title: data.title.trim() })
}

const getById = async (id) => {
  const task = await findTaskById(id)
  if (!task) throw new NotFoundError('Task not found.')
  return task
}

const list = ({ caseId, assigneeUserId, status } = {}) =>
  listTasks({
    ...(caseId ? { caseId } : {}),
    ...(assigneeUserId ? { assigneeUserId } : {}),
    ...(status ? { status } : {}),
  })

const update = async (id, data) => {
  await getById(id)
  const next = { ...data }
  if (next.title !== undefined) {
    next.title = next.title.trim()
    if (!next.title) throw new BadRequestError('title cannot be empty.')
  }
  if (next.status === TASK_STATUS.DONE && next.completedAt === undefined) {
    next.completedAt = new Date()
  }
  if (
    next.status &&
    next.status !== TASK_STATUS.DONE &&
    next.completedAt === undefined
  ) {
    next.completedAt = null
  }
  return updateTask(id, next)
}

export { create, getById, list, update }
