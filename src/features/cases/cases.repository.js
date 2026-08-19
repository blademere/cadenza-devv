const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const createCaseType = (data) => prisma.caseType.create({ data })
const createCase = (data) => prisma.caseRecord.create({ data })

const findCaseById = (id, options = {}) =>
  prisma.caseRecord.findUnique({
    where: { id },
    ...(options.includeDetails === false
      ? { select: { id: true, caseTypeId: true, status: true, caseNumber: true, title: true } }
      : { include: { caseType: true, participants: true, requirements: true, tasks: true } }),
  })

const findCaseTypeById = (id) => prisma.caseType.findUnique({ where: { id } })

const listCases = ({ skip, take, where }) =>
  prisma.caseRecord.findMany({
    where,
    skip,
    take,
    include: { caseType: true },
    orderBy: { createdAt: 'desc' },
  })

const countCases = (where) => prisma.caseRecord.count({ where })

const transitionCase = (id, fromStatus, toStatus, changedByUserId, reason, metadata) =>
  prisma.$transaction(async (tx) => {
    const updated = await tx.caseRecord.updateMany({
      where: { id, status: fromStatus },
      data: {
        status: toStatus,
        closedAt: toStatus === 'CLOSED' ? new Date() : null,
      },
    })

    if (updated.count !== 1) return null

    await tx.caseStatusHistory.create({
      data: {
        caseId: id,
        fromStatus,
        toStatus,
        changedByUserId,
        reason,
        metadata,
      },
    })

    return tx.caseRecord.findUnique({ where: { id } })
  })

module.exports = {
  createCaseType,
  createCase,
  findCaseById,
  findCaseTypeById,
  listCases,
  countCases,
  transitionCase,
}
