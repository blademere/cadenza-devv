const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const { createTask, findTaskById, listTasks, updateTask } = require('./tasks.repository')

const prisma = getPrismaClient()

const create = async (data) => {
  if (!data.title?.trim()) throw new BadRequestError('title is required.')
  if (data.caseId) {
    const caseRecord = await prisma.caseRecord.findUnique({ where: { id: data.caseId }, select: { id: true } })
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
  if (next.status === 'DONE' && next.completedAt === undefined) {
    next.completedAt = new Date()
  }
  if (next.status && next.status !== 'DONE' && next.completedAt === undefined) {
    next.completedAt = null
  }
  return updateTask(id, next)
}

module.exports = { create, getById, list, update }
