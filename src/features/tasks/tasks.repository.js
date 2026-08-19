const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const createTask = (data) => prisma.task.create({ data })
const findTaskById = (id) => prisma.task.findUnique({ where: { id } })
const listTasks = (where) => prisma.task.findMany({ where, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] })
const updateTask = (id, data) => prisma.task.update({ where: { id }, data })

module.exports = { createTask, findTaskById, listTasks, updateTask }
