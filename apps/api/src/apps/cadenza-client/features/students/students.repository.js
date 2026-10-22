import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { paginate } from '../../../../common/pagination/pagination.js';

const prisma = getPrismaClient();

export const studentsRepository = {
  async findAll(appId, filters = {}) {
    const where = {
      appId,
      enrollments: {
        some: { status: 'APPROVED' },
      },
    };

    return paginate({
      page: filters.page,
      limit: filters.limit,
      findMany: ({ skip, take }) => prisma.cadenzaCustomer.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        enrollments: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          include: {
            lessonPackage: {
              include: {
                lessons: {
                  select: { id: true, name: true },
                },
                courseMappings: {
                  select: {
                    course: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
            sessions: {
              orderBy: { scheduledStart: 'desc' },
              take: 1,
              include: {
                instructor: {
                  select: {
                    person: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { person: { lastName: 'asc' } },
        { person: { firstName: 'asc' } },
      ],
      skip,
      take,
      }),
      count: () => prisma.cadenzaCustomer.count({ where }),
    });
  },
};
