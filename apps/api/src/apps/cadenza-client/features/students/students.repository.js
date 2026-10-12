import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const studentsRepository = {
  async findAll(appId) {
    return prisma.cadenzaCustomer.findMany({
      where: { appId },
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
          orderBy: { createdAt: 'desc' },
          include: {
            lessonPackage: {
              include: {
                lessons: {
                  select: { id: true, name: true },
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
    });
  },
};
