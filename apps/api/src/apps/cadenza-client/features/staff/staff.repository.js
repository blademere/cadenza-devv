import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const staffRepository = {
  async findAll(appId, filters = {}) {
    const where = {
      appId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.staffType) {
      where.staffType = filters.staffType;
    }

    return prisma.cadenzaStaff.findMany({
      where,
      include: {
        person: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(appId, staffId) {
    return prisma.cadenzaStaff.findFirst({
      where: {
        id: staffId,
        appId,
      },
      include: {
        person: true,
      },
    });
  },

  async findByPersonId(appId, personId) {
    return prisma.cadenzaStaff.findFirst({
      where: {
        appId,
        personId,
      },
      include: {
        person: true,
      },
    });
  },

  async findByUserId(appId, userId) {
    return prisma.cadenzaStaff.findFirst({
      where: {
        appId,
        person: {
          userId,
        },
      },
      include: {
        person: true,
      },
    });
  },

  async create(data, db = prisma) {
    return db.cadenzaStaff.create({
      data,
      include: {
        person: true,
      },
    });
  },

  async update(appId, staffId, data) {
    return prisma.cadenzaStaff.update({
      where: {
        id: staffId,
        appId,
      },
      data,
      include: {
        person: true,
      },
    });
  },

  async delete(appId, staffId) {
    return prisma.cadenzaStaff.delete({
      where: {
        id: staffId,
        appId,
      },
    });
  },
};
