const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const addParticipant = (data) =>
  prisma.caseParticipant.create({
    data,
    include: { person: true },
  })

const listParticipants = (caseId) =>
  prisma.caseParticipant.findMany({
    where: { caseId },
    include: { person: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })

const findParticipant = (caseId, personId, roleKey) =>
  prisma.caseParticipant.findUnique({
    where: { caseId_personId_roleKey: { caseId, personId, roleKey } },
  })

const findCase = (id) => prisma.caseRecord.findUnique({ where: { id }, select: { id: true } })
const findPerson = (id) => prisma.person.findUnique({ where: { id }, select: { id: true } })
const findCaseAndPerson = (caseId, personId) =>
  Promise.all([findCase(caseId), findPerson(personId)])

const removeParticipant = (id) => prisma.caseParticipant.delete({ where: { id } })

module.exports = {
  addParticipant,
  listParticipants,
  findParticipant,
  findCase,
  findPerson,
  findCaseAndPerson,
  removeParticipant,
}
