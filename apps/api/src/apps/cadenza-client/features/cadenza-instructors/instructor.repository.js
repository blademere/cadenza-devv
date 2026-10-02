import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

const instructorInclude = {
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
  courseMappings: {
    where: {
      status: 'ACTIVE',
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  availabilityRules: {
    orderBy: [
      {
        dayOfWeek: 'asc',
      },
      {
        startMinute: 'asc',
      },
    ],
  },
  blocks: {
    orderBy: {
      startsAt: 'asc',
    },
  },
};

export const instructorRepository = {
  async findAll(appId, filters = {}) {
    const where = {
      appId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.cadenzaInstructor.findMany({
      where,
      include: instructorInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(appId, instructorId) {
    return prisma.cadenzaInstructor.findFirst({
      where: {
        id: instructorId,
        appId,
      },
      include: instructorInclude,
    });
  },

  async findByPersonId(appId, personId) {
    return prisma.cadenzaInstructor.findFirst({
      where: {
        appId,
        personId,
      },
      include: instructorInclude,
    });
  },

  async create(data, tx = prisma) {
    return tx.cadenzaInstructor.create({
      data,
      include: instructorInclude,
    });
  },

  async update(appId, instructorId, data) {
    const existing = await prisma.cadenzaInstructor.findFirst({
      where: {
        id: instructorId,
        appId,
      },
    });

    if (!existing) {
      return null;
    }

    return prisma.cadenzaInstructor.update({
      where: {
        id: instructorId,
      },
      data,
      include: instructorInclude,
    });
  },

  async addCourseMapping(data, tx = prisma) {
    return tx.cadenzaInstructorCourse.create({
      data,
      include: {
        course: true,
      },
    });
  },

  async findCourseMapping(appId, instructorId, courseId) {
    return prisma.cadenzaInstructorCourse.findFirst({
      where: {
        appId,
        instructorId,
        courseId,
      },
    });
  },

  async deleteCourseMapping(appId, instructorId, courseId) {
    return prisma.cadenzaInstructorCourse.deleteMany({
      where: {
        appId,
        instructorId,
        courseId,
      },
    });
  },

  async addAvailability(data) {
    return prisma.cadenzaInstructorAvailability.create({
      data,
    });
  },

  async getAvailability(appId, instructorId) {
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

  async findAvailabilityById(
    appId,
    instructorId,
    availabilityId,
  ) {
    return prisma.cadenzaInstructorAvailability.findFirst({
      where: {
        id: availabilityId,
        appId,
        instructorId,
      },
    });
  },

  async updateAvailability(
    appId,
    instructorId,
    availabilityId,
    data,
  ) {
    return prisma.cadenzaInstructorAvailability.updateMany({
      where: {
        id: availabilityId,
        appId,
        instructorId,
      },
      data,
    });
  },

  async deleteAvailability(
    appId,
    instructorId,
    availabilityId,
  ) {
    return prisma.cadenzaInstructorAvailability.deleteMany({
      where: {
        id: availabilityId,
        appId,
        instructorId,
      },
    });
  },

  async addBlock(data) {
    return prisma.cadenzaInstructorBlock.create({
      data,
    });
  },

  async getBlocks(appId, instructorId) {
    return prisma.cadenzaInstructorBlock.findMany({
      where: {
        appId,
        instructorId,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  },

  async findBlockById(appId, instructorId, blockId) {
    return prisma.cadenzaInstructorBlock.findFirst({
      where: {
        id: blockId,
        appId,
        instructorId,
      },
    });
  },

  async deleteBlock(
    appId,
    instructorId,
    blockId,
  ) {
    return prisma.cadenzaInstructorBlock.deleteMany({
      where: {
        id: blockId,
        appId,
        instructorId,
      },
    });
  },

  async findAvailabilityRule(
    appId,
    instructorId,
    dayOfWeek,
    startMinute,
    endMinute,
  ) {
    return prisma.cadenzaInstructorAvailability.findFirst({
      where: {
        appId,
        instructorId,
        dayOfWeek,
        startMinute: {
          lte: startMinute,
        },
        endMinute: {
          gte: endMinute,
        },
      },
    });
  },

  async findConflictingBlock(
    appId,
    instructorId,
    startsAt,
    endsAt,
  ) {
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

  async findConflictingSession(
    appId,
    instructorId,
    startsAt,
    endsAt,
    excludeSessionId = null,
  ) {
    const where = {
      appId,
      instructorId,
      scheduledStart: {
        lt: endsAt,
      },
      scheduledEnd: {
        gt: startsAt,
      },
    };

    if (excludeSessionId) {
      where.id = {
        not: excludeSessionId,
      };
    }

    return prisma.cadenzaLessonSession.findFirst({
      where,
    });
  },

  async createAuditLog(data, tx = prisma) {
    return tx.cadenzaAuditLog.create({
      data,
    });
  },
};
