import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const packageInclude = {
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
  courseMappings: {
    include: {
      course: {
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
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
};

const instructorSelect = {
  id: true,
  specialty: true,
  status: true,
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  courseMappings: {
    where: {
      status: 'ACTIVE',
    },
    select: {
      courseId: true,
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

export const enrollmentRepository = {
  async findAll(appId, filters = {}) {
    return prisma.cadenzaEnrollment.findMany({
      where: {
        appId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        lessonPackage: {
          include: packageInclude,
        },
        customer: {
          include: {
            person: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        sessions: {
          include: {
            instructor: {
              select: instructorSelect,
            },
          },
          orderBy: {
            scheduledStart: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findAvailablePackages(appId) {
    return prisma.cadenzaLessonPackage.findMany({
      where: {
        appId,
        status: 'ACTIVE',
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

  async findPackageById(appId, packageId) {
    return prisma.cadenzaLessonPackage.findFirst({
      where: {
        id: packageId,
        appId,
      },
      include: packageInclude,
    });
  },

  async findCompatibleInstructors(
    appId,
    courseId,
  ) {
    return prisma.cadenzaInstructor.findMany({
      where: {
        appId,
        status: 'ACTIVE',
        courseMappings: {
          some: {
            courseId,
            status: 'ACTIVE',
          },
        },
      },
      select: instructorSelect,
      orderBy: [
        {
          person: {
            lastName: 'asc',
          },
        },
        {
          person: {
            firstName: 'asc',
          },
        },
      ],
    });
  },

  async findInstructorCourse(
    appId,
    instructorId,
    courseId,
  ) {
    return prisma.cadenzaInstructorCourse.findFirst({
      where: {
        appId,
        instructorId,
        courseId,
        status: 'ACTIVE',
      },
    });
  },

  async findInstructorById(appId, instructorId) {
    return prisma.cadenzaInstructor.findFirst({
      where: {
        id: instructorId,
        appId,
      },
      select: instructorSelect,
    });
  },

  async findInstructorAvailability(appId, instructorId) {
    return prisma.cadenzaInstructorAvailability.findMany({
      where: {
        appId,
        instructorId,
      },
      orderBy: [
        {
          dayOfWeek: 'asc',
        },
        {
          startMinute: 'asc',
        },
      ],
    });
  },

  async findInstructorBlock(appId, instructorId, startsAt, endsAt) {
    return prisma.cadenzaInstructorBlock.findFirst({
      where: {
        appId,
        instructorId,
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
      },
    });
  },

  async findConflictingSession(appId, instructorId, startsAt, endsAt) {
    return prisma.cadenzaLessonSession.findFirst({
      where: {
        appId,
        instructorId,
        scheduledStart: {
          lt: endsAt,
        },
        scheduledEnd: {
          gt: startsAt,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
    });
  },

  async findEnrollmentByCustomerAndPackage(appId, customerId, lessonPackageId) {
    return prisma.cadenzaEnrollment.findFirst({
      where: {
        appId,
        customerId,
        lessonPackageId,
      },
      include: {
        lessonPackage: {
          include: packageInclude,
        },
        sessions: {
          include: {
            instructor: {
              select: instructorSelect,
            },
            room: true,
          },
          orderBy: {
            scheduledStart: 'asc',
          },
        },
      },
    });
  },

  async findEnrollmentById(appId, customerId, enrollmentId) {
    return prisma.cadenzaEnrollment.findFirst({
      where: {
        id: enrollmentId,
        appId,
        customerId,
      },
      include: {
        lessonPackage: {
          include: packageInclude,
        },
        sessions: {
          include: {
            instructor: {
              select: instructorSelect,
            },
            room: true,
          },
          orderBy: {
            scheduledStart: 'asc',
          },
        },
      },
    });
  },

  async findMyEnrollment(appId, customerId) {
    return prisma.cadenzaEnrollment.findFirst({
      where: {
        appId,
        customerId,
        status: {
          notIn: ['CANCELLED'],
        },
      },
      include: {
        lessonPackage: {
          include: packageInclude,
        },
        sessions: {
          include: {
            instructor: {
              select: instructorSelect,
            },
            room: true,
          },
          orderBy: {
            scheduledStart: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async createEnrollment(data) {
    return prisma.$transaction(async (tx) => {
      const enrollment = await tx.cadenzaEnrollment.create({
        data: {
          appId: data.appId,
          customerId: data.customerId,
          lessonPackageId: data.lessonPackageId,
          paymentObligationId: data.paymentObligationId || null,
          status: data.status || 'PENDING_PAYMENT',
          paymentExpiresAt: data.paymentExpiresAt || null,
          enrolledAt: data.enrolledAt || null,
          metadata: data.metadata || null,
        },
      });

      if (Array.isArray(data.sessions)) {
        await tx.cadenzaLessonSession.createMany({
          data: data.sessions.map((session) => ({
            appId: data.appId,
            enrollmentId: enrollment.id,
            instructorId: session.instructorId || null,
            roomId: session.roomId || null,
            scheduledStart: session.scheduledStart,
            scheduledEnd: session.scheduledEnd,
            status: session.status || 'SCHEDULED',
            metadata: session.metadata || null,
          })),
        });
      }

      return tx.cadenzaEnrollment.findFirst({
        where: {
          id: enrollment.id,
          appId: data.appId,
          customerId: data.customerId,
        },
        include: {
          lessonPackage: {
            include: packageInclude,
          },
          sessions: {
            include: {
              instructor: {
                select: instructorSelect,
              },
              room: true,
            },
            orderBy: {
              scheduledStart: 'asc',
            },
          },
        },
      });
    });
  },

  async cancelEnrollment(appId, customerId, enrollmentId, data) {
    const result = await prisma.cadenzaEnrollment.updateMany({
      where: {
        id: enrollmentId,
        appId,
        customerId,
        status: {
          notIn: ['CANCELLED', 'COMPLETED'],
        },
      },
      data: {
        status: 'CANCELLED',
        metadata: data?.metadata || undefined,
      },
    });

    if (!result.count) {
      return null;
    }

    return this.findEnrollmentById(appId, customerId, enrollmentId);
  },
};
