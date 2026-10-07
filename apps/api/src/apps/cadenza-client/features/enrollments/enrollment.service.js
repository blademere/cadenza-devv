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
    specialty: instructor.specialty || null,
    status: instructor.status,
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

    return packages
      .map(mapPackage)
      .filter((packageItem) => packageItem.lessons.length > 0);
  },

  async getCompatibleInstructors(
    appId,
    packageId,
    courseId,
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

    const instructors =
      await enrollmentRepository.findCompatibleInstructors(
        appId,
        course.id,
      );

    return instructors.map(mapInstructor);
  },

  async getInstructorAvailability(
    appId,
    packageId,
    instructorId,
    courseId,
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

    const availability =
      await enrollmentRepository.findInstructorAvailability(
        appId,
        instructorId,
      );

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

    const availability =
      await enrollmentRepository.findInstructorAvailability(
        appId,
        instructor.id,
      );

    const matchingAvailability =
      availability.find(
        (rule) =>
          rule.dayOfWeek === dayOfWeek &&
          rule.startMinute <= startMinute &&
          rule.endMinute >= endMinute,
      );

    if (!matchingAvailability) {
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

    const existing =
      await enrollmentRepository.findEnrollmentByCustomerAndPackage(
        appId,
        customerId,
        packageItem.id,
      );

    if (
      existing &&
      !['CANCELLED', 'COMPLETED'].includes(
        existing.status,
      )
    ) {
      throw new ConflictError(
        'You already have an enrollment for this package.',
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
      status: 'PENDING_PAYMENT',
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
