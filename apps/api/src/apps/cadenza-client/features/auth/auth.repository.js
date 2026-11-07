import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const cadenzaAuthRepository = {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  async findApplication() {
    return prisma.app.findUnique({
      where: {
        key: 'cadenza-client',
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  },

  async findStaffByUserIdAndAppId(userId, appId) {
    return prisma.cadenzaStaff.findFirst({
      where: {
        appId,
        person: {
          userId: Number(userId),
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
                authVersion: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    });
  },

  async findCustomerByUserIdAndAppId(userId, appId) {
    return prisma.cadenzaCustomer.findFirst({
      where: {
        appId,
        person: {
          userId: Number(userId),
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
                authVersion: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    });
  },

  async findInstructorByUserIdAndAppId(userId, appId) {
    return prisma.cadenzaInstructor.findFirst({
      where: {
        appId,
        person: {
          userId: Number(userId),
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
                authVersion: true,
                emailVerifiedAt: true,
              },
            },
          },
        },
      },
    });
  },

  async findActiveEnrollmentByCustomerId(customerId) {
    return prisma.cadenzaEnrollment.findFirst({
      where: {
        customerId,
        // Mobile access requires at least one currently participating course.
        // AT_RISK is still an active student enrollment and must remain
        // accessible. Completed, pending, suspended, and inactive courses do
        // not qualify, but another ACTIVE/AT_RISK course still can.
        status: { in: ['ACTIVE', 'AT_RISK'] },
      },
      orderBy: [
        { enrolledAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        lessonPackageId: true,
        status: true,
        enrolledAt: true,
      },
    });
  },
};
