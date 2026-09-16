import { BadRequestError, NotFoundError } from '../../common/errors/appError.js'
import {
  createTask,
  findTaskById,
  findCase,
  listTasks,
  updateTask,
} from './tasks.repository.js'
import { TASK_STATUS } from './tasks.constants.js'

const requireAppId = (appId) => {
  if (!appId) throw new BadRequestError('appId is required.')
  return appId
}

const create = async ({ appId, db, ...data }) => {
  requireAppId(appId)
  if (!data.title?.trim()) throw new BadRequestError('title is required.')

  if (data.caseId) {
    const caseRecord = await findCase(data.caseId, appId, db)
    if (!caseRecord) throw new NotFoundError('Case not found.')
  }

  return createTask({ ...data, appId, title: data.title.trim() }, db)
}

const getById = async (id, { appId, db } = {}) => {
  requireAppId(appId)
  const task = await findTaskById(id, appId, db)
  if (!task) throw new NotFoundError('Task not found.')
  return task
}

const list = ({ caseId, assigneeUserId, status } = {}, { appId, db } = {}) => {
  requireAppId(appId)
  return listTasks(
    {
      ...(caseId ? { caseId } : {}),
      ...(assigneeUserId ? { assigneeUserId } : {}),
      ...(status ? { status } : {}),
    },
    appId,
    db,
  )
}

const update = async (id, data, { appId, db } = {}) => {
  requireAppId(appId)
  await getById(id, { appId, db })

  const next = { ...data }
  if (next.caseId !== undefined && next.caseId !== null) {
    const caseRecord = await findCase(next.caseId, appId, db)
    if (!caseRecord) throw new NotFoundError('Case not found.')
  }
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

  const result = await updateTask(id, appId, next, db)
  if (!result.count) throw new NotFoundError('Task not found.')
  return getById(id, { appId, db })
}

export { create, getById, list, update }
