import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const packageInclude = {
  _count: {
    select: {
      enrollments: {
        where: {
          status: {
            notIn: ['CANCELLED', 'COMPLETED'],
          },
        },
      },
    },
  },
  lessons: {
    select: {
      id: true,
      name: true,
      description: true,
      level: true,
      status: true,
      materials: {
        select: {
          id: true,
          name: true,
          type: true,
          storageReference: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
};

export const enrollmentPackagesRepository = {
  findAll(appId, filters = {}) {
    return prisma.cadenzaLessonPackage.findMany({
      where: {
        appId,
        ...(filters.status
          ? {
              status: filters.status,
            }
          : {}),
      },
      include: packageInclude,
      orderBy: [
        {
          name: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  },

  findById(appId, id) {
    return prisma.cadenzaLessonPackage.findFirst({
      where: {
        id,
        appId,
      },
      include: packageInclude,
    });
  },

  findByName(
    appId,
    name,
    excludeId = null,
  ) {
    return prisma.cadenzaLessonPackage.findFirst({
      where: {
        appId,
        name,
        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
      },
      include: packageInclude,
    });
  },

  create(data) {
    return prisma.cadenzaLessonPackage.create({
      data,
      include: packageInclude,
    });
  },

  async update(appId, id, data) {
    const result =
      await prisma.cadenzaLessonPackage.updateMany({
        where: {
          id,
          appId,
        },
        data,
      });

    if (!result.count) {
      return null;
    }

    return prisma.cadenzaLessonPackage.findFirst({
      where: {
        id,
        appId,
      },
      include: packageInclude,
    });
  },
};