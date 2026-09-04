import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const createTask = (data) => prisma.task.create({ data })
const findTaskById = (id) => prisma.task.findUnique({ where: { id } })
const findCase = (id) => prisma.caseRecord.findUnique({ where: { id }, select: { id: true } })
const listTasks = (where) => prisma.task.findMany({ where, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] })
const updateTask = (id, data) => prisma.task.update({ where: { id }, data })

export { createTask, findTaskById, findCase, listTasks, updateTask }
