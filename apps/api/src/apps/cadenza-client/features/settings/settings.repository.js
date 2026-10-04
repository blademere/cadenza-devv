import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const settingsRepository = {
  findItemCategories(appId) {
    return prisma.cadenzaItemCategory.findMany({
      where: { appId },
      orderBy: { createdAt: 'asc' },
    });
  },

  findItemCategory(appId, id) {
    return prisma.cadenzaItemCategory.findFirst({
      where: { appId, id },
    });
  },

  createItemCategory(data) {
    return prisma.cadenzaItemCategory.create({ data });
  },

  updateItemCategory(appId, id, data) {
    return prisma.cadenzaItemCategory.updateMany({
      where: { appId, id },
      data,
    });
  },

  findInstrumentTypes(appId, status) {
    return prisma.cadenzaInstrumentType.findMany({
      where: {
        appId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  findInstrumentType(appId, id) {
    return prisma.cadenzaInstrumentType.findFirst({
      where: { appId, id },
    });
  },

  findInstrumentTypeByName(appId, name) {
    return prisma.cadenzaInstrumentType.findFirst({
      where: {
        appId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  },

  createInstrumentType(data) {
    return prisma.cadenzaInstrumentType.create({ data });
  },

  updateInstrumentType(appId, id, data) {
    return prisma.cadenzaInstrumentType.updateMany({
      where: { appId, id },
      data,
    });
  },
};
