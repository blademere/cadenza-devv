import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const instrumentsRepository = {
  findAll(appId, filters = {}) {
    return prisma.cadenzaInstrument.findMany({
      where: {
        appId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        itemCategory: true,
        instrumentType: true,
      },
    });
  },

  findById(appId, id) {
    return prisma.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
      include: {
        itemCategory: true,
        instrumentType: true,
      },
    });
  },

  create(data, client = prisma) {
    return client.cadenzaInstrument.create({
      data,
      include: {
        itemCategory: true,
        instrumentType: true,
      },
    });
  },

  async update(appId, id, data, client = prisma) {
    const result = await client.cadenzaInstrument.updateMany({
      where: {
        id,
        appId,
      },
      data,
    });

    if (!result.count) {
      return null;
    }

    return client.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
      include: {
        itemCategory: true,
        instrumentType: true,
      },
    });
  },
};
