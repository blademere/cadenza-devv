import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const requireAppId = (appId) => {
  if (!appId) throw new Error('Application context is required for participant access.')
  return appId
}

const addParticipant = async (data, appId, db = prisma) => {
  requireAppId(appId)
  const caseRecord = await db.caseRecord.findFirst({
    where: { id: data.caseId, appId },
    select: { id: true },
  })
  if (!caseRecord) return null
  return db.caseParticipant.create({
    data,
    include: { person: true },
  })
}

const listParticipants = (caseId, appId, db = prisma) => {
  requireAppId(appId)
  return db.caseParticipant.findMany({
    where: { caseId, caseRecord: { appId } },
    include: { person: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
}

const findParticipant = (caseId, personId, roleKey, appId, db = prisma) => {
  requireAppId(appId)
  return db.caseParticipant.findFirst({
    where: { caseId, personId, roleKey, caseRecord: { appId } },
  })
}

const findCase = (id, appId, db = prisma) => {
  requireAppId(appId)
  return db.caseRecord.findFirst({
    where: { id, appId },
    select: { id: true },
  })
}

const findPerson = (id, db = prisma) =>
  db.person.findUnique({ where: { id }, select: { id: true } })

const findCaseAndPerson = (caseId, personId, appId, db = prisma) =>
  Promise.all([findCase(caseId, appId, db), findPerson(personId, db)])

const removeParticipant = async (id, appId, db = prisma) => {
  requireAppId(appId)
  const participant = await db.caseParticipant.findFirst({
    where: { id, caseRecord: { appId } },
    select: { id: true },
  })
  if (!participant) return null
  return db.caseParticipant.delete({ where: { id: participant.id } })
}

export {
  addParticipant,
  listParticipants,
  findParticipant,
  findCase,
  findPerson,
  findCaseAndPerson,
  removeParticipant,
}
