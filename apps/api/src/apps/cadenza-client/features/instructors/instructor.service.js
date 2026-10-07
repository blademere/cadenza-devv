import bcrypt from 'bcrypt';

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';
import { instructorRepository } from './instructor.repository.js';

const prisma = getPrismaClient();

const INSTRUCTOR_STATUS = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
];

function getDayOfWeek(date) {
  const day = date.getDay();

  return day === 0 ? 7 : day;
}

function getMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizeAvailabilityRules(availability) {
  if (!Array.isArray(availability)) {
    return [];
  }

  const rules = availability.map((rule) => ({
    dayOfWeek: Number(rule.dayOfWeek),
    startMinute: Number(rule.startMinute),
    endMinute: Number(rule.endMinute),
  }));

  for (const rule of rules) {
    if (
      !Number.isInteger(rule.dayOfWeek) ||
      rule.dayOfWeek < 1 ||
      rule.dayOfWeek > 7 ||
      !Number.isInteger(rule.startMinute) ||
      !Number.isInteger(rule.endMinute) ||
      rule.startMinute < 0 ||
      rule.endMinute > 1440 ||
      rule.startMinute >= rule.endMinute
    ) {
      throw new BadRequestError('Invalid instructor availability schedule.');
    }
  }

  const seenDays = new Map();

  for (const rule of rules) {
    const dayRules = seenDays.get(rule.dayOfWeek) || [];

    if (
      dayRules.some(
        (existing) =>
          rule.startMinute < existing.endMinute &&
          rule.endMinute > existing.startMinute,
      )
    ) {
      throw new BadRequestError(
        'Instructor availability schedules cannot overlap.',
      );
    }

    dayRules.push(rule);
    seenDays.set(rule.dayOfWeek, dayRules);
  }

  return rules;
}

export const instructorService = {
  async getInstructors(appId, filters = {}) {
    return instructorRepository.findAll(appId, filters);
  },

  async getInstructorById(appId, instructorId) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    return instructor;
  },

  async createInstructorAccount(appId, data) {
    const email = data.email?.trim().toLowerCase();
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    const password = data.password;

    if (!email || !firstName || !lastName || !password) {
      throw new BadRequestError(
        'firstName, lastName, email, and password are required.',
      );
    }

    if (password.length < 8 || password.length > 72) {
      throw new BadRequestError(
        'Password must be between 8 and 72 characters.',
      );
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new ConflictError(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const courseIds = Array.isArray(data.courseIds)
      ? [...new Set(data.courseIds.filter(Boolean))]
      : [];

    if (courseIds.length === 0) {
      throw new BadRequestError(
        'At least one course specialization is required.',
      );
    }

    const courses = await prisma.cadenzaCourse.findMany({
      where: {
        appId,
        id: {
          in: courseIds,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (courseIds.length !== courses.length) {
      throw new BadRequestError(
        'One or more selected courses are invalid or inactive.',
      );
    }

    const availability = normalizeAvailabilityRules(data.availability);

    if (
      data.metadata?.employmentType === 'PART_TIME' &&
      availability.length === 0
    ) {
      throw new BadRequestError(
        'At least one availability schedule is required for a part-time instructor.',
      );
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            isActive: true,
          },
        });

        const person = await tx.person.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            email,
            phone: data.phone?.trim() || null,
          },
        });

        const instructor = await instructorRepository.create(
          {
            appId,
            personId: person.id,
            status: data.status || 'ACTIVE',
            metadata: data.metadata || null,
          },
          tx,
        );

        for (const course of courses) {
          await tx.cadenzaInstructorCourse.create({
            data: {
              appId,
              instructorId: instructor.id,
              courseId: course.id,
            },
          });
        }

        if (availability.length > 0) {
          await tx.cadenzaInstructorAvailability.createMany({
            data: availability.map((rule) => ({
              appId,
              instructorId: instructor.id,
              ...rule,
              isActive: true,
            })),
          });
        }

        return instructor;
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          'An account, person, or instructor record already exists.',
        );
      }

      throw error;
    }
  },

  async createInstructor(appId, data) {
    if (!data.personId) {
      throw new BadRequestError('Person ID is required.');
    }

    const courseIds = Array.isArray(data.courseIds)
      ? [...new Set(data.courseIds.filter(Boolean))]
      : [];

    if (courseIds.length === 0) {
      throw new BadRequestError(
        'At least one course specialization is required.',
      );
    }

    if (
      data.status &&
      !INSTRUCTOR_STATUS.includes(data.status)
    ) {
      throw new BadRequestError('Invalid instructor status.');
    }

    const existingInstructor =
      await instructorRepository.findByPersonId(
        appId,
        data.personId,
      );

    if (existingInstructor) {
      throw new ConflictError(
        'This person is already registered as an instructor.',
      );
    }

    const courses = await prisma.cadenzaCourse.findMany({
      where: {
        appId,
        id: { in: courseIds },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (courses.length !== courseIds.length) {
      throw new BadRequestError(
        'One or more selected courses are invalid or inactive.',
      );
    }

    return prisma.$transaction(async (tx) => {
      const instructor = await instructorRepository.create(
        {
          appId,
          personId: data.personId,
          status: data.status || 'ACTIVE',
          metadata: data.metadata || null,
        },
        tx,
      );

      await tx.cadenzaInstructorCourse.createMany({
        data: courseIds.map((courseId) => ({
          appId,
          instructorId: instructor.id,
          courseId,
          status: 'ACTIVE',
        })),
      });

      return instructor;
    });
  },

  async updateInstructor(appId, instructorId, data) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    if (
      data.status &&
      !INSTRUCTOR_STATUS.includes(data.status)
    ) {
      throw new BadRequestError('Invalid instructor status.');
    }

    const updateData = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    if (!Object.keys(updateData).length) {
      throw new BadRequestError(
        'No valid fields were provided for update.',
      );
    }

    const updated = await instructorRepository.update(
      appId,
      instructorId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundError('Instructor not found.');
    }

    return updated;
  },

  async deactivateInstructor(appId, instructorId) {
    return this.updateInstructor(appId, instructorId, {
      status: 'INACTIVE',
    });
  },

  async deactivateCourseMapping(
    appId,
    instructorId,
    courseId,
  ) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    const result =
      await instructorRepository.deactivateCourseMapping(
        appId,
        instructorId,
        courseId,
      );

    if (!result.count) {
      throw new NotFoundError(
        'Instructor specialty not found or already inactive.',
      );
    }

    return instructorRepository.findById(
      appId,
      instructorId,
    );
  },

  async addCourseMapping(appId, instructorId, data) {
    const courseId = data?.courseId;

    if (!courseId) {
      throw new BadRequestError('Course ID is required.');
    }

    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    const course = await prisma.cadenzaCourse.findFirst({
      where: {
        id: courseId,
        appId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      throw new BadRequestError(
        'Course is invalid or inactive.',
      );
    }

    const existing =
      await instructorRepository.findCourseMapping(
        appId,
        instructorId,
        courseId,
      );

    if (existing?.status === 'ACTIVE') {
      throw new ConflictError(
        'This specialty is already assigned to the instructor.',
      );
    }

    if (existing) {
      await instructorRepository.activateCourseMapping(
        appId,
        instructorId,
        courseId,
      );
    } else {
      try {
        await instructorRepository.addCourseMapping({
          appId,
          instructorId,
          courseId,
          status: 'ACTIVE',
        });
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new ConflictError(
            'This specialty is already assigned to the instructor.',
          );
        }

        throw error;
      }
    }

    return instructorRepository.findById(
      appId,
      instructorId,
    );
  },

  async getAvailability(appId, instructorId) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    return instructorRepository.getAvailability(
      appId,
      instructorId,
    );
  },

  async addAvailability(appId, instructorId, data) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    const dayOfWeek = Number(data.dayOfWeek);
    const startMinute = Number(data.startMinute);
    const endMinute = Number(data.endMinute);

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 1 ||
      dayOfWeek > 7
    ) {
      throw new BadRequestError(
        'dayOfWeek must be between 1 and 7.',
      );
    }

    if (
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute)
    ) {
      throw new BadRequestError(
        'startMinute and endMinute must be integers.',
      );
    }

    if (
      startMinute < 0 ||
      startMinute > 1440 ||
      endMinute < 0 ||
      endMinute > 1440
    ) {
      throw new BadRequestError(
        'Availability time must be between 0 and 1440 minutes.',
      );
    }

    if (startMinute >= endMinute) {
      throw new BadRequestError(
        'Start time must be before end time.',
      );
    }

    const overlapping =
      await instructorRepository.findOverlappingAvailability(
        appId,
        instructorId,
        dayOfWeek,
        startMinute,
        endMinute,
      );

    if (overlapping) {
      throw new ConflictError(
        'This availability overlaps an existing schedule.',
      );
    }

    try {
      return await instructorRepository.addAvailability({
        appId,
        instructorId,
        dayOfWeek,
        startMinute,
        endMinute,
        isActive: true,
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          'This availability schedule already exists.',
        );
      }

      throw error;
    }
  },

  async updateAvailability(
    appId,
    instructorId,
    availabilityId,
    data,
  ) {
    const existing =
      await instructorRepository.findAvailabilityById(
        appId,
        instructorId,
        availabilityId,
      );

    if (!existing) {
      throw new NotFoundError(
        'Availability schedule not found.',
      );
    }

    const dayOfWeek =
      data.dayOfWeek !== undefined
        ? Number(data.dayOfWeek)
        : existing.dayOfWeek;

    const startMinute =
      data.startMinute !== undefined
        ? Number(data.startMinute)
        : existing.startMinute;

    const endMinute =
      data.endMinute !== undefined
        ? Number(data.endMinute)
        : existing.endMinute;

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 1 ||
      dayOfWeek > 7
    ) {
      throw new BadRequestError(
        'dayOfWeek must be between 1 and 7.',
      );
    }

    if (
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute)
    ) {
      throw new BadRequestError(
        'startMinute and endMinute must be integers.',
      );
    }

    if (
      startMinute < 0 ||
      startMinute > 1440 ||
      endMinute < 0 ||
      endMinute > 1440
    ) {
      throw new BadRequestError(
        'Availability time must be between 0 and 1440 minutes.',
      );
    }

    if (startMinute >= endMinute) {
      throw new BadRequestError(
        'Start time must be before end time.',
      );
    }

    const overlapping =
      await instructorRepository.findOverlappingAvailability(
        appId,
        instructorId,
        dayOfWeek,
        startMinute,
        endMinute,
        availabilityId,
      );

    if (overlapping) {
      throw new ConflictError(
        'This availability overlaps an existing schedule.',
      );
    }

    const result =
      await instructorRepository.updateAvailability(
        appId,
        instructorId,
        availabilityId,
        {
          dayOfWeek,
          startMinute,
          endMinute,
        },
      );

    if (!result.count) {
      throw new NotFoundError(
        'Availability schedule not found.',
      );
    }

    return instructorRepository.findAvailabilityById(
      appId,
      instructorId,
      availabilityId,
    );
  },

  async deactivateAvailability(
    appId,
    instructorId,
    availabilityId,
  ) {
    const existing =
      await instructorRepository.findAvailabilityById(
        appId,
        instructorId,
        availabilityId,
      );

    if (!existing) {
      throw new NotFoundError(
        'Availability schedule not found.',
      );
    }

    const result =
      await instructorRepository.deactivateAvailability(
        appId,
        instructorId,
        availabilityId,
      );

    if (!result.count) {
      throw new NotFoundError(
        'Availability schedule not found or already inactive.',
      );
    }

    return true;
  },

  async getBlocks(appId, instructorId) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    return instructorRepository.getBlocks(
      appId,
      instructorId,
    );
  },

  async addBlock(appId, instructorId, data) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      throw new BadRequestError(
        'Invalid block start or end date.',
      );
    }

    if (startsAt >= endsAt) {
      throw new BadRequestError(
        'Block start must be before block end.',
      );
    }

    const existingBlock =
      await instructorRepository.findConflictingBlock(
        appId,
        instructorId,
        startsAt,
        endsAt,
      );

    if (existingBlock) {
      throw new ConflictError(
        'The instructor already has an unavailable period during this time.',
      );
    }

    const existingSession =
      await instructorRepository.findConflictingSession(
        appId,
        instructorId,
        startsAt,
        endsAt,
      );

    if (existingSession) {
      throw new ConflictError(
        'The instructor already has a lesson during this time.',
      );
    }

    return instructorRepository.addBlock({
      appId,
      instructorId,
      startsAt,
      endsAt,
      reason: data.reason?.trim() || null,
    });
  },

  async deleteBlock(
    appId,
    instructorId,
    blockId,
  ) {
    const existing =
      await instructorRepository.findBlockById(
        appId,
        instructorId,
        blockId,
      );

    if (!existing) {
      throw new NotFoundError(
        'Instructor unavailable period not found.',
      );
    }

    await instructorRepository.deleteBlock(
      appId,
      instructorId,
      blockId,
    );

    return true;
  },

  async checkAvailability(
    appId,
    instructorId,
    startsAtValue,
    endsAtValue,
  ) {
    const instructor = await instructorRepository.findById(
      appId,
      instructorId,
    );

    if (!instructor) {
      throw new NotFoundError('Instructor not found.');
    }

    if (instructor.status !== 'ACTIVE') {
      return {
        available: false,
        reason: 'Instructor is not active.',
      };
    }

    const startsAt = new Date(startsAtValue);
    const endsAt = new Date(endsAtValue);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      throw new BadRequestError(
        'Invalid lesson start or end date.',
      );
    }

    if (startsAt >= endsAt) {
      throw new BadRequestError(
        'Lesson start must be before lesson end.',
      );
    }

    const dayOfWeek = getDayOfWeek(startsAt);
    const startMinute = getMinuteOfDay(startsAt);
    const endMinute = getMinuteOfDay(endsAt);

    const availability =
      await instructorRepository.findAvailabilityRule(
        appId,
        instructorId,
        dayOfWeek,
        startMinute,
        endMinute,
      );

    if (!availability) {
      return {
        available: false,
        reason:
          'Instructor is not available during this time.',
      };
    }

    const block =
      await instructorRepository.findConflictingBlock(
        appId,
        instructorId,
        startsAt,
        endsAt,
      );

    if (block) {
      return {
        available: false,
        reason:
          'Instructor is unavailable during this time.',
      };
    }

    const session =
      await instructorRepository.findConflictingSession(
        appId,
        instructorId,
        startsAt,
        endsAt,
      );

    if (session) {
      return {
        available: false,
        reason:
          'Instructor already has a lesson during this time.',
      };
    }

    return {
      available: true,
      reason: null,
    };
  },
};
