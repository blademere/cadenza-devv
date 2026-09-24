import { Prisma } from '@prisma/client'
import {getPrismaClient} from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const run = async (callback, db = prisma) => {
  if (db !== prisma) return db.$transaction(callback)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === 2) throw error
    }
  }
}

export { run }
