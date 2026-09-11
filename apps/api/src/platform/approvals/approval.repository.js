import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()
const policyInclude = { steps: { orderBy: { stepOrder: 'asc' } } }
const instanceInclude = { policy: { include: { steps: true } }, requests: true }
const runTransaction = (operation, db = prisma) => db === prisma ? prisma.$transaction(operation) : operation(db)
const createPolicy = (data, db = prisma) => db.approvalPolicy.create({ data, include: policyInclude })
const findPolicies = ({ entityType }, db = prisma) => db.approvalPolicy.findMany({ where: { entityType, active: true }, include: policyInclude, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] })
const findPolicyByKey = (key, db = prisma) => db.approvalPolicy.findUnique({ where: { key }, include: policyInclude })
const findPendingInstance = ({ policyId, subjectType, subjectId }, db = prisma) => db.approvalInstance.findFirst({ where: { policyId, subjectType, subjectId: String(subjectId), status: 'PENDING' }, include: instanceInclude })
const createInstance = (data, db) => db.approvalInstance.create({ data })
const createRequests = (data, db) => db.approvalRequest.createMany({ data })
const findInstance = (id, db) => db.approvalInstance.findUnique({ where: { id }, include: instanceInclude })
const findRequest = (requestId, db = prisma) => db.approvalRequest.findUnique({ where: { id: requestId }, include: { instance: { include: { policy: { include: { steps: { orderBy: { stepOrder: 'asc' } } } } } }, step: true } })
const updateRequest = (requestId, actorId, data, db) => db.approvalRequest.updateMany({ where: { id: requestId, assigneeUserId: actorId, status: 'PENDING' }, data })
const cancelPendingRequests = (instanceId, db) => db.approvalRequest.updateMany({ where: { instanceId, status: 'PENDING' }, data: { status: 'CANCELLED', actedAt: new Date() } })
const findStepRequests = (instanceId, stepId, db) => db.approvalRequest.findMany({ where: { instanceId, stepId } })
const skipPendingStepRequests = (instanceId, stepId, db) => db.approvalRequest.updateMany({ where: { instanceId, stepId, status: 'PENDING' }, data: { status: 'SKIPPED', actedAt: new Date() } })
const updateInstance = (id, data, db) => db.approvalInstance.update({ where: { id }, data, include: { requests: true } })

export { runTransaction, createPolicy, findPolicies, findPolicyByKey, findPendingInstance, createInstance, createRequests, findInstance, findRequest, updateRequest, cancelPendingRequests, findStepRequests, skipPendingStepRequests, updateInstance }
