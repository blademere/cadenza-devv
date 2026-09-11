import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const createTask = (data, db = prisma) => db.task.create({ data })
const findTaskById = (id, db = prisma) => db.task.findUnique({ where: { id } })
const findCase = (id, db = prisma) => db.caseRecord.findUnique({ where: { id }, select: { id: true } })
const listTasks = (where, db = prisma) => db.task.findMany({ where, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] })
const updateTask = (id, data, db = prisma) => db.task.update({ where: { id }, data })

export { createTask, findTaskById, findCase, listTasks, updateTask }
