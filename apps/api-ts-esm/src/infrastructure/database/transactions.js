const { getPrismaClient } = require('./prisma')

const runInTransaction = async (handler) => {
  const prisma = getPrismaClient()

  return prisma.$transaction(handler)
}

module.exports = {
  runInTransaction,
}
