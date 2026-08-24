const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const createPerson = (data) => prisma.person.create({ data })

const findPersonById = (id) => prisma.person.findUnique({ where: { id } })

const listPeople = ({ skip, take, where }) =>
  prisma.person.findMany({
    where,
    skip,
    take,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

const countPeople = (where) => prisma.person.count({ where })

const updatePerson = (id, data) => prisma.person.update({ where: { id }, data })

module.exports = {
  createPerson,
  findPersonById,
  listPeople,
  countPeople,
  updatePerson,
}
