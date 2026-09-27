import { getPrismaClient } from '../../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

export const instrumentsRepository = {
  findAll(appId, filters = {}) {
    return prisma.cadenzaInstrument.findMany({
      where: {
        appId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.instrumentType
          ? { instrumentType: filters.instrumentType }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  },

  findById(appId, id) {
    return prisma.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
    })
  },

  create(data, client = prisma) {
    return client.cadenzaInstrument.create({
      data,
    })
  },

  async update(appId, id, data, client = prisma) {
    const result = await client.cadenzaInstrument.updateMany({
      where: {
        id,
        appId,
      },
      data,
    })

    if (!result.count) {
      return null
    }

    return client.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
    })
  },
}