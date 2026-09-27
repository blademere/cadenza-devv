import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const instrumentRentalsRepository = {
  findAll(appId) {
    return prisma.cadenzaInstrument.findMany({
      where: {
        appId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  findById(appId, id) {
    return prisma.cadenzaInstrument.findFirst({
      where: {
        id,
        appId,
      },
    });
  },

  update(appId, id, data) {
    return prisma.cadenzaInstrument
      .updateMany({
        where: {
          id,
          appId,
        },
        data,
      })
      .then(async (result) => {
        if (!result.count) {
          return null;
        }

        return prisma.cadenzaInstrument.findFirst({
          where: {
            id,
            appId,
          },
        });
      });
  },
};
