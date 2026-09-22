import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const createTask = (data, db = prisma) => db.task.create({ data })
const findTaskById = (id, appId, db = prisma) =>
  db.task.findFirst({ where: { id, appId } })
const findCase = (id, appId, db = prisma) =>
  db.caseRecord.findFirst({ where: { id, appId }, select: { id: true, appId: true } })
const listTasks = (where, appId, db = prisma) =>
  db.task.findMany({
    where: { ...where, appId },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
  })
const updateTask = (id, appId, data, db = prisma) =>
  db.task.updateMany({ where: { id, appId }, data })

export { createTask, findTaskById, findCase, listTasks, updateTask }
