import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const addParticipant = (data, db = prisma) =>
  db.caseParticipant.create({
    data,
    include: { person: true },
  })
const listParticipants = (caseId, db = prisma) =>
  db.caseParticipant.findMany({
    where: { caseId },
    include: { person: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
const findParticipant = (caseId, personId, roleKey, db = prisma) =>
  db.caseParticipant.findUnique({
    where: { caseId_personId_roleKey: { caseId, personId, roleKey } },
  })
const findCase = (id, db = prisma) =>
  db.caseRecord.findUnique({ where: { id }, select: { id: true } })
const findPerson = (id, db = prisma) =>
  db.person.findUnique({ where: { id }, select: { id: true } })
const findCaseAndPerson = (caseId, personId, db = prisma) =>
  Promise.all([findCase(caseId, db), findPerson(personId, db)])
const removeParticipant = (id, db = prisma) =>
  db.caseParticipant.delete({ where: { id } })

export {
  addParticipant,
  listParticipants,
  findParticipant,
  findCase,
  findPerson,
  findCaseAndPerson,
  removeParticipant,
}
