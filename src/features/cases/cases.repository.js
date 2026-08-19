const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const createCase = (data) => prisma.caseRecord.create({ data })

const findCaseById = (id) =>
  prisma.caseRecord.findUnique({
    where: { id },
    include: { caseType: true, participants: true, requirements: true, tasks: true },
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
    const current = await tx.caseRecord.findUnique({ where: { id } })
    if (!current) return null
    const updated = await tx.caseRecord.update({
      where: { id },
      data: {
        status: toStatus,
        closedAt: toStatus === 'CLOSED' ? new Date() : null,
      },
    })
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
    return updated
  })

module.exports = {
  createCase,
  findCaseById,
  findCaseTypeById,
  listCases,
  countCases,
  transitionCase,
}
