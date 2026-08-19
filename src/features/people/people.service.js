const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const {
  normalizePagination,
  createPaginationMeta,
} = require('../../common/pagination/pagination')
const {
  createPerson,
  findPersonById,
  listPeople,
  countPeople,
  updatePerson,
} = require('./people.repository')

const normalizeName = (value) => value?.trim()

const create = async (data) => {
  const firstName = normalizeName(data.firstName)
  const lastName = normalizeName(data.lastName)
  if (!firstName || !lastName) {
    throw new BadRequestError('firstName and lastName are required.')
  }
  return createPerson({ ...data, firstName, lastName })
}

const getById = async (id) => {
  const person = await findPersonById(id)
  if (!person) throw new NotFoundError('Person not found.')
  return person
}

const list = async (query = {}) => {
  const pagination = normalizePagination(query)
  const where = {
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
  }
  const [people, total] = await Promise.all([
    listPeople({ skip: pagination.skip, take: pagination.take, where }),
    countPeople(where),
  ])
  return {
    data: people,
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  }
}

const update = async (id, data) => {
  await getById(id)
  const next = { ...data }
  if (next.firstName !== undefined) next.firstName = normalizeName(next.firstName)
  if (next.lastName !== undefined) next.lastName = normalizeName(next.lastName)
  if (next.firstName === '' || next.lastName === '') {
    throw new BadRequestError('firstName and lastName cannot be empty.')
  }
  return updatePerson(id, next)
}

module.exports = { create, getById, list, update }
