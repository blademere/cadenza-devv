import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

export const cadenzaAuthRepository = {
  async findUserByEmail(email) {
    // Email addresses are case-insensitive. This matters for mobile login
    // because Google returns a normalized/lowercase address while older
    // database records may contain uppercase characters.
    return prisma.user.findFirst({
      where: {
        email: { equals: String(email).trim(), mode: 'insensitive' },
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
        // Front Desk approval normally changes status to APPROVED. Older
        // records may retain FOR_APPROVAL while storing approvalStatus in
        // metadata, so both representations must authorize mobile access.
        OR: [
          { status: { in: ['APPROVED', 'ACTIVE', 'AT_RISK'] } },
          { status: 'FOR_APPROVAL', metadata: { path: ['approvalStatus'], equals: 'APPROVED' } },
        ],
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
