import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { publish } from '../../platform/event-bus/event-bus.js'
import { run as runTransaction } from '../../platform/transactions/transaction.service.js'

const prisma = getPrismaClient()

const createCaseType = (data, db = prisma) => db.caseType.create({ data })
const findCaseTypeByKey = (key, db = prisma) => db.caseType.findUnique({ where: { key } })

const publishCaseCreated = async (record, data, db) => {
  await publish({
    db,
    event: 'case.created',
    entityType: 'Case',
    entityId: record.id,
    actorId: data.createdByUserId || null,
    context: {
      appId: record.appId,
      caseTypeId: record.caseTypeId,
      caseNumber: record.caseNumber,
      status: record.status,
    },
    idempotencyKey: `case:${record.id}:created`,
  })
}

const createCase = (data, db = prisma) => {
  if (db === prisma) {
    return runTransaction(async (tx) => {
      const record = await tx.caseRecord.create({ data })
      await publishCaseCreated(record, data, tx)
      return record
    })
  }
  return db.caseRecord.create({ data }).then(async (record) => {
    await publishCaseCreated(record, data, db)
    return record
  })
}

const findCaseById = (id, { appId, db = prisma, includeDetails = true } = {}) => {
  if (!appId) throw new Error('appId is required to access a case.')
  return db.caseRecord.findFirst({
    where: { id, appId },
    ...(includeDetails === false
      ? {
          select: {
            id: true,
            appId: true,
            caseTypeId: true,
            status: true,
            caseNumber: true,
            title: true,
          },
        }
      : {
          include: {
            caseType: true,
            participants: true,
            requirements: true,
            tasks: true,
          },
        }),
  })
}

const findCaseTypeById = (id, db = prisma) => db.caseType.findUnique({ where: { id } })
const listCases = ({ skip, take, where, appId }, db = prisma) => {
  if (!appId) throw new Error('appId is required to list cases.')
  return db.caseRecord.findMany({ where: { ...(where || {}), appId }, skip, take, include: { caseType: true }, orderBy: { createdAt: 'desc' } })
}
const countCases = ({ where, appId }, db = prisma) => {
  if (!appId) throw new Error('appId is required to count cases.')
  return db.caseRecord.count({ where: { ...(where || {}), appId } })
}
const transitionCase = (id, appId, fromStatus, toStatus, changedByUserId, reason, metadata, db = prisma) => {
  if (!appId) throw new Error('appId is required to transition a case.')
  const run = async (tx) => {
    const updated = await tx.caseRecord.updateMany({ where: { id, appId, status: fromStatus }, data: { status: toStatus, closedAt: toStatus === 'CLOSED' ? new Date() : null } })
    if (updated.count !== 1) return null
    const history = await tx.caseStatusHistory.create({ data: { caseId: id, fromStatus, toStatus, changedByUserId, reason, metadata } })
    await publish({ db: tx, event: 'case.transitioned', entityType: 'Case', entityId: id, actorId: changedByUserId || null, context: { appId, fromStatus, toStatus, reason: reason || null, metadata: metadata || {}, historyId: history.id }, idempotencyKey: `case:${id}:transition:${history.id}` })
    return tx.caseRecord.findFirst({ where: { id, appId } })
  }
  return db === prisma ? runTransaction(run) : run(db)
}

export { createCaseType, findCaseTypeByKey, createCase, findCaseById, findCaseTypeById, listCases, countCases, transitionCase }
