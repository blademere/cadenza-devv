import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { enrollmentRepository } from './enrollment.repository.js';

function getDayOfWeek(date) {
  const day = date.getDay();

  return day === 0 ? 7 : day;
}

function getMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

const FULL_TIME_START_MINUTE = 8 * 60;
const FULL_TIME_END_MINUTE = 18 * 60;
const FULL_TIME_DAYS = [1, 2, 3, 4, 5];

function isFullTimeInstructor(instructor) {
  return instructor?.metadata?.employmentType === 'FULL_TIME';
}

function getFullTimeAvailability(requiredDuration) {
  if (
    FULL_TIME_END_MINUTE - FULL_TIME_START_MINUTE <
    requiredDuration
  ) {
    return [];
  }

  return FULL_TIME_DAYS.flatMap((dayOfWeek) =>
    Array.from(
      {
        length: (FULL_TIME_END_MINUTE - FULL_TIME_START_MINUTE) / 60,
      },
      (_, index) => {
        const startMinute = FULL_TIME_START_MINUTE + index * 60;

        return {
          id: `full-time-${dayOfWeek}-${startMinute}`,
          dayOfWeek,
          startMinute,
          endMinute: startMinute + 60,
          isActive: true,
          isAutomatic: true,
        };
      },
    ),
  );
}

function getInstructorName(instructor) {
  if (!instructor?.person) {
    return 'Instructor';
  }

  return [
    instructor.person.firstName,
    instructor.person.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

function mapInstructor(instructor) {
  return {
    id: instructor.id,
    name: getInstructorName(instructor),
    email: instructor.person?.email || null,
    status: instructor.status,
    employmentType:
      instructor.metadata?.employmentType === 'FULL_TIME'
        ? 'FULL_TIME'
        : 'PART_TIME',
    automaticScheduleWindow: isFullTimeInstructor(instructor)
      ? { start: '08:00', end: '18:00' }
      : null,
    courses:
      instructor.courseMappings?.map((mapping) => ({
        id: mapping.courseId,
        name: mapping.course?.name || '',
      })) || [],
  };
}

function getConfiguredLessons(lessons) {
  if (!Array.isArray(lessons)) {
    return [];
  }

  return lessons.filter(
    (lesson) =>
      lesson?.status === 'ACTIVE' &&
      Array.isArray(lesson.materials) &&
      lesson.materials.length > 0,
  );
}

function getPackageLessons(packageItem) {
  const legacyLessons = Array.isArray(packageItem?.lessons)
    ? packageItem.lessons
    : [];
  const mappedLessons = Array.isArray(packageItem?.courseMappings)
    ? packageItem.courseMappings
        .map((mapping) => mapping.course)
        .filter(Boolean)
    : [];
  const lessons = [...legacyLessons, ...mappedLessons];

  return lessons.filter(
    (lesson, index, allLessons) =>
      allLessons.findIndex((item) => item.id === lesson.id) === index,
  );
}

function getCourseForPackage(packageItem, courseId) {
  const configuredLessons = getConfiguredLessons(
    getPackageLessons(packageItem),
  );

  if (courseId) {
    return configuredLessons.find(
      (lesson) => lesson.id === courseId,
    ) || null;
  }

  return configuredLessons.length === 1
    ? configuredLessons[0]
    : null;
}

function mapPackage(packageItem) {
  const lessons = getConfiguredLessons(getPackageLessons(packageItem));

  return {
    id: packageItem.id,
    name: packageItem.name,
    price: Number(packageItem.price),
    numberOfSessions:
      packageItem.numberOfSessions,
    sessionDurationMinutes:
      packageItem.sessionDurationMinutes,
    sessionsPerWeek:
      packageItem.sessionsPerWeek,
    status: packageItem.status,
    metadata: packageItem.metadata,
    lessons,
    createdAt: packageItem.createdAt,
    updatedAt: packageItem.updatedAt,
  };
}

function mapEnrollment(enrollment) {
  const lessons = getConfiguredLessons(
    getPackageLessons(enrollment.lessonPackage),
  );

  return {
    id: enrollment.id,
    customerId: enrollment.customerId,
    student: enrollment.customer?.person
      ? [
          enrollment.customer.person.firstName,
          enrollment.customer.person.middleName,
          enrollment.customer.person.lastName,
        ]
          .filter(Boolean)
          .join(' ')
      : null,
    studentEmail: enrollment.customer?.person?.email || null,
    packageId: enrollment.lessonPackageId,
    packageName: enrollment.lessonPackage?.name,
    courseId: enrollment.metadata?.courseId || null,
    metadata: enrollment.metadata,
    price: enrollment.lessonPackage
      ? Number(enrollment.lessonPackage.price)
      : null,
    numberOfSessions:
      enrollment.lessonPackage
        ?.numberOfSessions || 0,
    sessionDurationMinutes:
      enrollment.lessonPackage
        ?.sessionDurationMinutes || 0,
    sessionsPerWeek:
      enrollment.lessonPackage
        ?.sessionsPerWeek || 0,
    lessons,
    status: enrollment.status,
    paymentObligationId:
      enrollment.paymentObligationId,
    paymentExpiresAt:
      enrollment.paymentExpiresAt,
    enrolledAt: enrollment.enrolledAt,
    sessions:
      enrollment.sessions?.map((session) => ({
        id: session.id,
        instructorId:
          session.instructorId,
        instructorName:
          session.instructor
            ? getInstructorName(session.instructor)
            : null,
        roomId: session.roomId,
        scheduledStart:
          session.scheduledStart,
        scheduledEnd:
          session.scheduledEnd,
        status: session.status,
      })) || [],
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
}

export const enrollmentService = {
  async getEnrollments(appId, filters = {}) {
    const enrollments = await enrollmentRepository.findAll(
      appId,
      filters,
    );

    return enrollments.map(mapEnrollment);
  },

  async getAvailablePackages(appId) {
    const packages =
      await enrollmentRepository.findAvailablePackages(
        appId,
      );

    const activeEnrollments = customerId
      ? await enrollmentRepository.findActiveEnrollmentsByCustomer(
          appId,
          customerId,
        )
      : [];
    const activeCoursesByPackage = new Map();

    for (const enrollment of activeEnrollments) {
      const courseId = enrollment.metadata?.courseId;

      if (!courseId) {
        continue;
      }

      const courseIds =
        activeCoursesByPackage.get(enrollment.lessonPackageId) ||
        new Set();
      courseIds.add(courseId);
      activeCoursesByPackage.set(enrollment.lessonPackageId, courseIds);
    }

    return packages.map(mapPackage).map((packageItem) => {
      const activeCourseIds = activeCoursesByPackage.get(packageItem.id);
      const availableLessons = activeCourseIds
        ? packageItem.lessons.filter(
            (lesson) => !activeCourseIds.has(lesson.id),
          )
        : packageItem.lessons;

      return {
        ...packageItem,
        // Keep all lessons so the current enrollment can still be displayed;
        // `lessons` is the client-selectable set for new enrollments.
        allLessons: packageItem.lessons,
        lessons: availableLessons,
      };
    });
  },

  async getCompatibleInstructors(
    appId,
    packageId,
    courseId,
    customerId,
  ) {
    const packageItem =
      await enrollmentRepository.findPackageById(
        appId,
        packageId,
      );

    if (!packageItem) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    if (packageItem.status !== 'ACTIVE') {
      throw new BadRequestError(
        'This enrollment package is not currently available.',
      );
    }

    if (getConfiguredLessons(getPackageLessons(packageItem)).length === 0) {
      return [];
    }

    const course = getCourseForPackage(packageItem, courseId);

    if (!course) {
      throw new BadRequestError(
        'A configured course is required to select an instructor.',
      );
    }

    if (customerId) {
      const activeEnrollments =
        await enrollmentRepository.findActiveEnrollmentsByCustomer(
          appId,
          customerId,
        );
      const alreadyEnrolled = activeEnrollments.some(
        (enrollment) =>
          enrollment.lessonPackageId === packageId &&
          enrollment.metadata?.courseId === course.id,
      );

      if (alreadyEnrolled) {
        return [];
      }
    }

    const instructors =
      await enrollmentRepository.findCompatibleInstructors(
        appId,
        course.id,
      );

    const requiredSessionsPerWeek = Number(
      packageItem.sessionsPerWeek,
    );
    const requiredDuration = Number(
      packageItem.sessionDurationMinutes,
    );

    if (
      !Number.isInteger(requiredSessionsPerWeek) ||
      requiredSessionsPerWeek < 1 ||
      !Number.isInteger(requiredDuration) ||
      requiredDuration < 1
    ) {
      return [];
    }

    const eligibleInstructors = [];

    for (const instructor of instructors) {
      if (isFullTimeInstructor(instructor)) {
        if (getFullTimeAvailability(requiredDuration).length >= requiredSessionsPerWeek) {
          eligibleInstructors.push(instructor);
        }
        continue;
      }

      const availability =
        await enrollmentRepository.findInstructorAvailability(
          appId,
          instructor.id,
        );

      const availableDays = new Set(
        availability
          .filter(
            (rule) =>
              rule.endMinute - rule.startMinute >= requiredDuration,
          )
          .map((rule) => rule.dayOfWeek),
      );

      if (availableDays.size >= requiredSessionsPerWeek) {
        eligibleInstructors.push(instructor);
      }
    }

    return eligibleInstructors.map(mapInstructor);
  },

  async getInstructorAvailability(
    appId,
    packageId,
    instructorId,
    courseId,
    startDate,
  ) {
    const packageItem =
      await enrollmentRepository.findPackageById(
        appId,
        packageId,
      );

    if (!packageItem) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    if (packageItem.status !== 'ACTIVE') {
      throw new BadRequestError(
        'This enrollment package is not currently available.',
      );
    }

    if (getConfiguredLessons(getPackageLessons(packageItem)).length === 0) {
      throw new BadRequestError(
        'This package has no configured course materials yet.',
      );
    }

    const course = getCourseForPackage(packageItem, courseId);

    if (!course) {
      throw new BadRequestError(
        'A configured course is required for instructor availability.',
      );
    }

    const instructor =
      await enrollmentRepository.findInstructorById(
        appId,
        instructorId,
      );

    if (!instructor) {
      throw new NotFoundError(
        'Instructor not found.',
      );
    }

    if (instructor.status !== 'ACTIVE') {
      throw new BadRequestError(
        'This instructor is not active.',
      );
    }

    const mapping =
      await enrollmentRepository.findInstructorCourse(
        appId,
        instructorId,
        course.id,
      );

    if (!mapping) {
      throw new BadRequestError(
        'This instructor is not mapped to the selected course.',
      );
    }

    const requiredDuration = Number(
      packageItem.sessionDurationMinutes,
    );

    let availability = isFullTimeInstructor(instructor)
      ? getFullTimeAvailability(requiredDuration)
      : await enrollmentRepository.findInstructorAvailability(
          appId,
          instructorId,
        );

    availability = availability.filter(
      (rule) => rule.endMinute - rule.startMinute >= requiredDuration,
    );

    if (startDate) {
      const dateStart = new Date(startDate);
      if (Number.isNaN(dateStart.getTime())) {
        throw new BadRequestError('Invalid start date.');
      }
      dateStart.setHours(0, 0, 0, 0);
      const dateDayOfWeek = getDayOfWeek(dateStart);

      // Check every occurrence in the enrollment cycle. This prevents a slot
      // from being offered when an existing active enrollment already uses
      // that weekday/time in any of the upcoming weeks.
      const requiredSessionsPerWeek = Number(packageItem.sessionsPerWeek);
      const enrollmentWeeks =
        Number.isInteger(requiredSessionsPerWeek) &&
        requiredSessionsPerWeek > 0
          ? Math.max(
              1,
              Math.ceil(
                Number(packageItem.numberOfSessions) /
                  requiredSessionsPerWeek,
              ),
            )
          : 1;
      const availableRules = [];

      for (const rule of availability) {
        const dayOffset = (rule.dayOfWeek - dateDayOfWeek + 7) % 7;
        let isAvailable = true;

        for (let week = 0; week < enrollmentWeeks; week += 1) {
          const sessionStart = new Date(dateStart);
          sessionStart.setDate(
            sessionStart.getDate() + dayOffset + week * 7,
          );
          sessionStart.setHours(
            Math.floor(rule.startMinute / 60),
            rule.startMinute % 60,
            0,
            0,
          );
          const sessionEnd = new Date(
            sessionStart.getTime() +
              packageItem.sessionDurationMinutes * 60 * 1000,
          );

          const [conflictingSession, conflictingBlock] = await Promise.all([
            enrollmentRepository.findConflictingSession(
              appId,
              instructorId,
              sessionStart,
              sessionEnd,
            ),
            enrollmentRepository.findInstructorBlock(
              appId,
              instructorId,
              sessionStart,
              sessionEnd,
            ),
          ]);

          if (conflictingSession || conflictingBlock) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable) {
          availableRules.push(rule);
        }
      }

      availability = availableRules;
    }

    return {
      instructor: mapInstructor(instructor),
      courseId: course.id,
      courseName: course.name,
      availability,
    };
  },

  async validateSession(
    appId,
    packageItem,
    session,
    courseId,
  ) {
    const startsAt = new Date(
      session.scheduledStart,
    );

    const endsAt = new Date(
      session.scheduledEnd,
    );

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      throw new BadRequestError(
        'Invalid session start or end date.',
      );
    }

    if (startsAt >= endsAt) {
      throw new BadRequestError(
        'Session start must be before session end.',
      );
    }

    const expectedDuration =
      packageItem.sessionDurationMinutes;

    const actualDuration =
      (endsAt.getTime() - startsAt.getTime()) /
      60000;

    if (actualDuration !== expectedDuration) {
      throw new BadRequestError(
        `Each session must be exactly ${expectedDuration} minutes.`,
      );
    }

    const instructor =
      await enrollmentRepository.findInstructorById(
        appId,
        session.instructorId,
      );

    if (!instructor) {
      throw new NotFoundError(
        'Selected instructor not found.',
      );
    }

    if (instructor.status !== 'ACTIVE') {
      throw new BadRequestError(
        'Selected instructor is not active.',
      );
    }

    const mapping =
      await enrollmentRepository.findInstructorCourse(
        appId,
        instructor.id,
        courseId,
      );

    if (!mapping) {
      throw new BadRequestError(
        'Selected instructor is not mapped to the selected course.',
      );
    }

    const dayOfWeek =
      getDayOfWeek(startsAt);

    const startMinute =
      getMinuteOfDay(startsAt);

    const endMinute =
      getMinuteOfDay(endsAt);

    const availability = isFullTimeInstructor(instructor)
      ? getFullTimeAvailability(expectedDuration)
      : await enrollmentRepository.findInstructorAvailability(
          appId,
          instructor.id,
        );

    const matchingAvailability = availability.find(
      (rule) =>
        rule.dayOfWeek === dayOfWeek &&
        rule.startMinute <= startMinute &&
        rule.endMinute >= endMinute,
    );

    if (!isFullTimeInstructor(instructor) && !matchingAvailability) {
      throw new BadRequestError(
        `Instructor is not available on ${startsAt.toLocaleDateString()} at the selected time.`,
      );
    }

    const block =
      await enrollmentRepository.findInstructorBlock(
        appId,
        instructor.id,
        startsAt,
        endsAt,
      );

    if (block) {
      throw new ConflictError(
        'Instructor is unavailable during the selected time.',
      );
    }

    const conflictingSession =
      await enrollmentRepository.findConflictingSession(
        appId,
        instructor.id,
        startsAt,
        endsAt,
      );

    if (conflictingSession) {
      throw new ConflictError(
        'Instructor already has a lesson during the selected time.',
      );
    }

    return {
      instructor,
      startsAt,
      endsAt,
    };
  },

  async createEnrollment(
    appId,
    customerId,
    data,
  ) {
    const packageItem =
      await enrollmentRepository.findPackageById(
        appId,
        data.lessonPackageId,
      );

    if (!packageItem) {
      throw new NotFoundError(
        'Enrollment package not found.',
      );
    }

    if (packageItem.status !== 'ACTIVE') {
      throw new BadRequestError(
        'This enrollment package is not currently available.',
      );
    }

    if (getConfiguredLessons(getPackageLessons(packageItem)).length === 0) {
      throw new BadRequestError(
        'This package has no configured course materials yet.',
      );
    }

    const configuredLessons = getConfiguredLessons(
      getPackageLessons(packageItem),
    );

    const courseId = data.metadata?.courseId || null;

    if (
      data.metadata?.courseId &&
      !configuredLessons.some(
        (lesson) => lesson.id === data.metadata.courseId,
      )
    ) {
      throw new BadRequestError(
        'The selected course is not configured for this package.',
      );
    }

    if (!getCourseForPackage(packageItem, courseId)) {
      throw new BadRequestError(
        'A configured course is required for this enrollment.',
      );
    }

    if (
      !Array.isArray(data.sessions) ||
      data.sessions.length !==
        packageItem.numberOfSessions
    ) {
      throw new BadRequestError(
        `This package requires exactly ${packageItem.numberOfSessions} sessions.`,
      );
    }

    const existingEnrollments =
      await enrollmentRepository.findEnrollmentByCustomerAndPackage(
        appId,
        customerId,
        packageItem.id,
      );

    const existing = existingEnrollments.find(
      (enrollment) =>
        enrollment.metadata?.courseId === courseId &&
        !['CANCELLED', 'COMPLETED'].includes(enrollment.status),
    );

    if (existing) {
      throw new ConflictError(
        'You already have an enrollment for this course in this package.',
      );
    }

    const validatedSessions = [];

    for (const session of data.sessions) {
      const validated =
        await this.validateSession(
          appId,
          packageItem,
          session,
          courseId,
        );

      validatedSessions.push({
        instructorId:
          session.instructorId,
        roomId:
          session.roomId || null,
        scheduledStart:
          validated.startsAt,
        scheduledEnd:
          validated.endsAt,
        status: 'SCHEDULED',
        metadata:
          session.metadata || null,
      });
    }

    const sortedSessions = [
      ...validatedSessions,
    ].sort(
      (a, b) =>
        a.scheduledStart.getTime() -
        b.scheduledStart.getTime(),
    );

    for (
      let index = 1;
      index < sortedSessions.length;
      index += 1
    ) {
      const previous =
        sortedSessions[index - 1];

      const current =
        sortedSessions[index];

      if (
        current.scheduledStart <
        previous.scheduledEnd
      ) {
        throw new ConflictError(
          'Enrollment sessions cannot overlap.',
        );
      }
    }

    return enrollmentRepository.createEnrollment({
      appId,
      customerId,
      lessonPackageId: packageItem.id,
      status: 'FOR_APPROVAL',
      paymentObligationId:
        data.paymentObligationId || null,
      paymentExpiresAt:
        data.paymentExpiresAt
          ? new Date(data.paymentExpiresAt)
          : null,
      enrolledAt: null,
      metadata: data.metadata || null,
      sessions: validatedSessions,
    });
  },

  async validateSchedule(appId, data) {
    const packageItem = await enrollmentRepository.findPackageById(
      appId,
      data.lessonPackageId,
    );

    if (!packageItem || packageItem.status !== 'ACTIVE') {
      throw new BadRequestError('This enrollment package is not available.');
    }

    const courseId = data.metadata?.courseId || null;
    const configuredLessons = getConfiguredLessons(
      getPackageLessons(packageItem),
    );

    if (!getCourseForPackage(packageItem, courseId)) {
      throw new BadRequestError(
        'A configured course is required for this enrollment.',
      );
    }

    if (
      !Array.isArray(data.sessions) ||
      data.sessions.length !== packageItem.numberOfSessions
    ) {
      throw new BadRequestError(
        `This package requires exactly ${packageItem.numberOfSessions} sessions.`,
      );
    }

    for (const session of data.sessions) {
      await this.validateSession(
        appId,
        packageItem,
        session,
        courseId,
      );
    }

    return { valid: true, courseId, configuredCourseCount: configuredLessons.length };
  },

  async getMyEnrollment(
    appId,
    customerId,
  ) {
    const enrollment =
      await enrollmentRepository.findMyEnrollment(
        appId,
        customerId,
      );

    if (!enrollment) {
      return null;
    }

    return mapEnrollment(enrollment);
  },

  async getEnrollmentById(
    appId,
    customerId,
    enrollmentId,
  ) {
    const enrollment =
      await enrollmentRepository.findEnrollmentById(
        appId,
        customerId,
        enrollmentId,
      );

    if (!enrollment) {
      throw new NotFoundError(
        'Enrollment not found.',
      );
    }

    return mapEnrollment(enrollment);
  },

  async cancelEnrollment(
    appId,
    customerId,
    enrollmentId,
  ) {
    const enrollment =
      await enrollmentRepository.findEnrollmentById(
        appId,
        customerId,
        enrollmentId,
      );

    if (!enrollment) {
      throw new NotFoundError(
        'Enrollment not found.',
      );
    }

    if (
      ['CANCELLED', 'COMPLETED'].includes(
        enrollment.status,
      )
    ) {
      throw new BadRequestError(
        'This enrollment cannot be cancelled.',
      );
    }

    const cancelled =
      await enrollmentRepository.cancelEnrollment(
        appId,
        customerId,
        enrollmentId,
      );

    if (!cancelled) {
      throw new NotFoundError(
        'Enrollment not found.',
      );
    }

    return mapEnrollment(cancelled);
  },
};
