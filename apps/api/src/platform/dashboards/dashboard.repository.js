import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findByKey = (key, db = prisma) => db.dashboard.findUnique({ where: { key } })
const create = (data, db = prisma) => db.dashboard.create({ data, include: { widgets: { orderBy: { sortOrder: 'asc' } } } })
const findActiveByKey = (key, db = prisma) =>
  db.dashboard.findUnique({
    where: { key },
    include: { widgets: { orderBy: { sortOrder: 'asc' } } },
  })
const createWidget = (data, db = prisma) => db.dashboardWidget.create({ data })

export { findByKey, create, findActiveByKey, createWidget }
