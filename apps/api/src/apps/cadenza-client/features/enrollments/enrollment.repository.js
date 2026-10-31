import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { paginate } from '../../../../common/pagination/pagination.js';

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
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          status: true,
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
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              status: true,
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
  status: true,
  metadata: true,
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
  async findRescheduleRequestById(appId, id) {
    return prisma.cadenzaRescheduleRequest.findFirst({ where: { id, appId, status: 'PENDING' } });
  },
  async updateRescheduleRequest(id, data) {
    return prisma.cadenzaRescheduleRequest.update({ where: { id }, data });
  },
  async confirmReschedule(appId, requestId, targetStart, targetEnd) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.cadenzaRescheduleRequest.findFirst({ where: { id: requestId, appId, status: 'PENDING' } });
      if (!request) return null;
      const session = await tx.cadenzaLessonSession.update({
        where: { id: request.sessionId },
        data: { scheduledStart: targetStart, scheduledEnd: targetEnd, metadata: { ...(await tx.cadenzaLessonSession.findUnique({ where: { id: request.sessionId }, select: { metadata: true } }))?.metadata, rescheduled: true, rescheduledAt: new Date().toISOString() } },
      });
      await tx.cadenzaRescheduleRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', metadata: { ...(request.metadata || {}), confirmedAt: new Date().toISOString(), confirmedStart: targetStart.toISOString(), confirmedEnd: targetEnd.toISOString() } },
      });
      return session;
    });
  },
  async findRescheduleRequests(appId) {
    return prisma.cadenzaRescheduleRequest.findMany({
      where: { status: 'PENDING', session: { appId } },
      include: {
        session: {
          include: {
            enrollment: { include: { customer: { include: { person: true } } } },
            instructor: { include: { person: true } },
            room: true,
          },
        },
        requestedByPerson: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },
  async emergencyRescheduleSessions(appId, sessionIds, targetStart, targetEnd) {
    return prisma.$transaction(async (tx) => {
      const sessions = await tx.cadenzaLessonSession.findMany({ where: { appId, id: { in: sessionIds } } });
      if (sessions.length !== sessionIds.length) return null;
      const duration = targetEnd.getTime() - targetStart.getTime();
      await Promise.all(sessions.map((session, index) => {
        const start = new Date(targetStart.getTime() + index * duration);
        return tx.cadenzaLessonSession.update({
          where: { id: session.id },
          data: { scheduledStart: start, scheduledEnd: new Date(start.getTime() + duration), metadata: { ...(session.metadata || {}), emergencyRescheduled: true } },
        });
      }));
      return tx.cadenzaLessonSession.findMany({ where: { appId, id: { in: sessionIds } }, orderBy: { scheduledStart: 'asc' } });
    });
  },
  async findAll(appId, filters = {}) {
    const where = {
      appId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    return paginate({
      page: filters.page,
      limit: filters.limit,
      findMany: ({ skip, take }) => prisma.cadenzaEnrollment.findMany({
      where,
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
      skip,
      take,
      }),
      count: () => prisma.cadenzaEnrollment.count({ where }),
    });
  },

  async updateStaffDecision(appId, enrollmentId, data) {
    const result = await prisma.cadenzaEnrollment.updateMany({
      where: {
        id: enrollmentId,
        appId,
        status: 'FOR_APPROVAL',
      },
      data,
    });

    if (!result.count) {
      return null;
    }

    const enrollments = await this.findAll(appId);
    return enrollments.items.find((enrollment) => enrollment.id === enrollmentId) || null;
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

  async findConflictingCustomerSession(appId, customerId, startsAt, endsAt) {
    return prisma.cadenzaLessonSession.findFirst({
      where: {
        appId,
        enrollment: {
          customerId,
          status: { notIn: ['CANCELLED', 'COMPLETED', 'REJECTED'] },
        },
        status: { notIn: ['CANCELLED'] },
        scheduledStart: { lt: endsAt },
        scheduledEnd: { gt: startsAt },
      },
      select: { id: true },
    });
  },

  async findCustomerProfile(appId, customerId) {
    return prisma.cadenzaCustomer.findFirst({
      where: { appId, id: customerId },
      select: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            metadata: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  },

  async findActiveEnrollmentsByCustomer(appId, customerId) {
    return prisma.cadenzaEnrollment.findMany({
      where: {
        appId,
        customerId,
        status: {
          notIn: ['CANCELLED', 'COMPLETED', 'REJECTED'],
        },
      },
      select: {
        lessonPackageId: true,
        metadata: true,
      },
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
        isActive: true,
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

  async findInstructorFutureSessions(appId, instructorId) {
    return prisma.cadenzaLessonSession.findMany({
      where: {
        appId,
        instructorId,
        scheduledEnd: { gte: new Date() },
        status: { notIn: ['CANCELLED'] },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    });
  },

  async findInstructorSessionsForDate(
    appId,
    instructorId,
    startsAt,
    endsAt,
  ) {
    return prisma.cadenzaLessonSession.findMany({
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
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    });
  },

  async findInstructorBlocksForDate(
    appId,
    instructorId,
    startsAt,
    endsAt,
  ) {
    return prisma.cadenzaInstructorBlock.findMany({
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
      select: {
        startsAt: true,
        endsAt: true,
      },
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
    return prisma.cadenzaEnrollment.findMany({
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
      orderBy: {
        createdAt: 'desc',
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
    return prisma.cadenzaEnrollment.findMany({
      where: {
        appId,
        customerId,
        status: {
          notIn: ['COMPLETED', 'REJECTED'],
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
          priceAtEnrollment: data.priceAtEnrollment,
          packageNameAtEnrollment: data.packageNameAtEnrollment,
          numberOfSessionsAtEnrollment: data.numberOfSessionsAtEnrollment,
          sessionDurationMinutesAtEnrollment: data.sessionDurationMinutesAtEnrollment,
          sessionsPerWeekAtEnrollment: data.sessionsPerWeekAtEnrollment,
          termsSnapshot: data.termsSnapshot || null,
          paymentObligationId: data.paymentObligationId || null,
          status: 'FOR_APPROVAL',
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
