const { getPrismaClient } = require('../../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const listActive = () => prisma.oboPermitType.findMany({
  where: { isActive: true },
  orderBy: { name: 'asc' },
})

module.exports = { listActive }
