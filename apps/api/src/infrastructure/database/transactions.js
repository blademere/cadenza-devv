import { getPrismaClient } from './prisma.js'

const runInTransaction = async (handler) => {
  const prisma = getPrismaClient()

  return prisma.$transaction(handler)
}

export { runInTransaction }
