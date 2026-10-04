import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createPolicy = (data, db = prisma) => db.slaPolicy.create({ data })
const findPolicies = ({ entityType, workflowStepKey }, db = prisma) =>
  db.slaPolicy.findMany({
    where: {
      entityType,
      active: true,
      ...(workflowStepKey ? { OR: [{ workflowStepKey }, { workflowStepKey: null }] } : {}),
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
const findPolicyByKey = (key, db = prisma) => db.slaPolicy.findUnique({ where: { key } })
const createInstance = (data, db = prisma) => db.slaInstance.create({ data })
const findInstanceById = (id, db = prisma) => db.slaInstance.findUnique({ where: { id } })
const updateInstance = (id, data, db = prisma) => db.slaInstance.update({ where: { id }, data })
const findDueInstances = (now, db = prisma) =>
  db.slaInstance.findMany({
    where: { status: { in: ['RUNNING', 'ESCALATED'] }, dueAt: { lte: now } },
    select: { id: true },
  })
const markBreached = (ids, db = prisma) =>
  db.slaInstance.updateMany({
    where: { id: { in: ids }, status: { in: ['RUNNING', 'ESCALATED'] } },
    data: { status: 'BREACHED' },
  })
const findEscalationCandidates = (db = prisma) =>
  db.slaInstance.findMany({
    where: { status: 'RUNNING', escalatedAt: null, policy: { escalationSeconds: { not: null } } },
    include: { policy: true },
  })
const markEscalated = (ids, now, db = prisma) =>
  db.slaInstance.updateMany({
    where: { id: { in: ids }, status: 'RUNNING', escalatedAt: null },
    data: { status: 'ESCALATED', escalatedAt: now },
  })

export {
  createPolicy,
  findPolicies,
  findPolicyByKey,
  createInstance,
  findInstanceById,
  updateInstance,
  findDueInstances,
  markBreached,
  findEscalationCandidates,
  markEscalated,
}
