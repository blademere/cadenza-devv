import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findActiveRules = ({ event, entityType = null }, db = prisma) => db.businessRule.findMany({
  where: {
    event,
    active: true,
    ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}),
  },
  orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
})

const createRuleRecord = (data, db = prisma) => db.businessRule.create({ data })

export { findActiveRules, createRuleRecord }
