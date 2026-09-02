import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createPerson = (data) => prisma.person.create({ data })

const findPersonById = (id) => prisma.person.findUnique({ where: { id } })

const findPersonByUserId = (userId) =>
  prisma.person.findUnique({ where: { userId: Number(userId) } })

const listPeople = ({ skip, take, where }) =>
  prisma.person.findMany({
    where,
    skip,
    take,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

const countPeople = (where) => prisma.person.count({ where })

const updatePerson = (id, data) => prisma.person.update({ where: { id }, data })

export default {
  createPerson,
  findPersonById,
  findPersonByUserId,
  listPeople,
  countPeople,
  updatePerson,
}
