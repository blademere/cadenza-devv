import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listRules = (instructorId, appId, db = prisma) =>
  db.cadenzaInstructorAvailability.findMany({
    where: { instructorId, appId },
    orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
  })

const replaceRules = async (instructorId, appId, rules, db = prisma) => {
  await db.cadenzaInstructorAvailability.deleteMany({ where: { instructorId, appId } })
  if (!rules.length) return []
  await db.cadenzaInstructorAvailability.createMany({
    data: rules.map((rule) => ({ ...rule, instructorId, appId })),
  })
  return listRules(instructorId, appId, db)
}

const listBlocks = (instructorId, appId, db = prisma) =>
  db.cadenzaInstructorBlock.findMany({
    where: { instructorId, appId },
    orderBy: { startsAt: 'asc' },
  })

const findOverlappingBlock = (instructorId, appId, startsAt, endsAt, db = prisma) =>
  db.cadenzaInstructorBlock.findFirst({
    where: {
      instructorId,
      appId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  })

const createBlock = (data, db = prisma) =>
  db.cadenzaInstructorBlock.create({ data })

const deleteBlock = (id, instructorId, appId, db = prisma) =>
  db.cadenzaInstructorBlock.deleteMany({ where: { id, instructorId, appId } })

const withTransaction = (callback) => prisma.$transaction(callback)

export { listRules, replaceRules, listBlocks, findOverlappingBlock, createBlock, deleteBlock, withTransaction }
