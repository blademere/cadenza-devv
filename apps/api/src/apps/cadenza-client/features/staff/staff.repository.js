import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const staffRepository = {
  async findAll(appId, filters = {}) {
    const where = {
      appId,
    };

    if (filters.staffType) {
      where.staffType = filters.staffType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.cadenzaStaff.findMany({
      where,
      include: {
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
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
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
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
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
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
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  },

  async create(data, tx = prisma) {
    return tx.cadenzaStaff.create({
      data,
      include: {
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  },

  async update(appId, staffId, data) {
    return prisma.cadenzaStaff.update({
      where: {
        id: staffId,
      },
      data,
      include: {
        person: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  },

  async updateProfile(appId, staffId, data) {
    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: data.personId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          user: {
            update: {
              email: data.email,
            },
          },
        },
      });

      return tx.cadenzaStaff.update({
        where: { id: staffId },
        data: {
          status: data.status,
        },
        include: {
          person: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });
    });
  },
};
