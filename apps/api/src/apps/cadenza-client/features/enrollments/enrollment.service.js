import { assertUnusedPaymentReference } from '../billing-payments/payment-reference.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import { enrollmentRepository } from './enrollment.repository.js';
import { settingsService } from '../settings/settings.service.js';
import {
  assertWithinOperatingHours,
} from '../settings/operating-hours.js';
import { getOperatingHoursForDate } from '../settings/operating-hours.js';

function getDayOfWeek(date) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    weekday,
  );

  return day === 0 ? 7 : day;
}

function getMinuteOfDay(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return Number(parts.hour) * 60 + Number(parts.minute);
}

function getManilaDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date(value))
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysToManilaDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function createManilaDateTime(dateKey, minute) {
  const hour = String(Math.floor(minute / 60)).padStart(2, '0');
  const minutes = String(minute % 60).padStart(2, '0');

  return new Date(`${dateKey}T${hour}:${minutes}:00+08:00`);
}

function isFullTimeInstructor(instructor) {
  return instructor?.metadata?.employmentType === 'FULL_TIME';
}

function moveOutsideHoursToNextWeek(session, operatingHours) {
  const start = new Date(session.scheduledStart);
  const end = new Date(session.scheduledEnd);
  const duration = end.getTime() - start.getTime();

  for (let attempt = 0; attempt < 52; attempt += 1) {
    const hours = getOperatingHoursForDate(operatingHours, start);
    const dateKey = getManilaDateKey(start);
    const opening = hours?.startTime
      ? new Date(`${dateKey}T${hours.startTime}:00+08:00`)
      : null;
    const closing = hours?.endTime
      ? new Date(`${dateKey}T${hours.endTime}:00+08:00`)
      : null;

    if (!hours?.isClosed && opening && closing && start >= opening && end <= closing) {
      return { ...session, scheduledStart: start, scheduledEnd: end };
    }

    start.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setTime(start.getTime() + duration);
  }

  return { ...session, scheduledStart: start, scheduledEnd: end };
}

function moveSessionOneWeek(session) {
  const start = new Date(session.scheduledStart);
  const end = new Date(session.scheduledEnd);
  start.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  end.setTime(end.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { ...session, scheduledStart: start, scheduledEnd: end };
}

function overlapsExistingSession(session, sessions) {
  const start = new Date(session.scheduledStart).getTime();
  const end = new Date(session.scheduledEnd).getTime();
  return sessions.some((existing) => {
    if (existing.instructorId !== session.instructorId) return false;
    const existingStart = new Date(existing.scheduledStart).getTime();
    const existingEnd = new Date(existing.scheduledEnd).getTime();
    return start < existingEnd && end > existingStart;
  });
}

function getFullTimeAvailability(operatingHours, sessionDuration) {
  // The settings service creates the app-scoped row when it does not exist.
  // Do not silently replace a missing/invalid DB schedule with hardcoded hours.
  const weeklyHours = operatingHours?.weeklyHours || {};
  const duration = Number(sessionDuration);
  const rules = [];

  for (let javascriptDay = 0; javascriptDay < 7; javascriptDay += 1) {
    const hours = weeklyHours[String(javascriptDay)];

    if (!hours || hours.isClosed) {
      continue;
    }

    const [startHour, startMinute] = hours.startTime.split(':').map(Number);
    const [endHour, endMinute] = hours.endTime.split(':').map(Number);
    const openingMinute = startHour * 60 + startMinute;
    const closingMinute = endHour * 60 + endMinute;
    const dayOfWeek = javascriptDay === 0 ? 7 : javascriptDay;

    for (
      let start = openingMinute;
      start + duration <= closingMinute;
      start += 30
    ) {
      rules.push({
        id: `full-time-${dayOfWeek}-${start}-${duration}`,
        dayOfWeek,
        startMinute: start,
        endMinute: start + duration,
        isActive: true,
      });
    }
  }

  return rules;
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
    automaticScheduleWindow: null,
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
    packageName: enrollment.packageNameAtEnrollment || enrollment.lessonPackage?.name,
    courseId: enrollment.metadata?.courseId || null,
    metadata: enrollment.metadata,
    price: enrollment.priceAtEnrollment != null
      ? Number(enrollment.priceAtEnrollment)
      : enrollment.lessonPackage
        ? Number(enrollment.lessonPackage.price)
        : null,
    numberOfSessions: enrollment.numberOfSessionsAtEnrollment
      ?? enrollment.lessonPackage?.numberOfSessions ?? 0,
    sessionDurationMinutes: enrollment.sessionDurationMinutesAtEnrollment
      ?? enrollment.lessonPackage?.sessionDurationMinutes ?? 0,
    sessionsPerWeek: enrollment.sessionsPerWeekAtEnrollment
      ?? enrollment.lessonPackage?.sessionsPerWeek ?? 0,
    termsSnapshot: enrollment.termsSnapshot,
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
  async submitRescheduleOptions(appId, requestId, options) {
    if (!Array.isArray(options) || !options.length) throw new BadRequestError('At least one replacement schedule option is required.');
    const request = await enrollmentRepository.findRescheduleRequestById(appId, requestId);
    if (!request) throw new NotFoundError('Reschedule request not found.');
    if (request.metadata?.optionsSubmittedAt) throw new ConflictError('Replacement schedule options have already been submitted.');
    const metadata = { ...(request.metadata || {}), generatedOptions: options, optionsSubmittedAt: new Date().toISOString(), workflowStatus: 'AWAITING_PARTICIPANT_CHOICES' };
    return enrollmentRepository.updateRescheduleRequest(requestId, { metadata });
  },
  async confirmReschedule(appId, requestId, option) {
    if (!option?.date || !option?.time) throw new BadRequestError('A valid matching schedule is required.');
    const times = option.time.split(' - ').map((value) => value.trim());
    if (times.length !== 2) throw new BadRequestError('The selected schedule time is invalid.');
    const toDate = (value) => {
      const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let hour = Number(match[1]);
      if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
      return `${option.date}T${String(hour).padStart(2, '0')}:${match[2]}:00+08:00`;
    };
    const start = new Date(toDate(times[0]));
    const end = new Date(toDate(times[1]));
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) throw new BadRequestError('The selected schedule time is invalid.');
    const result = await enrollmentRepository.confirmReschedule(appId, requestId, start, end);
    if (!result) throw new NotFoundError('Pending reschedule request not found.');
    return result;
  },
  async getRescheduleRequests(appId) {
    const requests = await enrollmentRepository.findRescheduleRequests(appId);
    const todayInManila = new Date(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()) + 'T00:00:00+08:00');
    return requests.map((request) => ({
      id: request.id,
      status: request.status,
      reason: request.reason,
      requestedAt: request.createdAt,
      requestedStart: request.requestedStart,
      requestedEnd: request.requestedEnd,
      rescheduleFromDate: request.session?.scheduledStart ? new Date(request.session.scheduledStart).toISOString().slice(0, 10) : null,
      sessionId: request.sessionId,
      requesterType: request.requestedByPersonId === request.session?.instructor?.personId ? 'Instructor' : 'Student',
      student: [request.session?.enrollment?.customer?.person?.firstName, request.session?.enrollment?.customer?.person?.lastName].filter(Boolean).join(' ') || 'Student',
      instructor: [request.session?.instructor?.person?.firstName, request.session?.instructor?.person?.lastName].filter(Boolean).join(' ') || 'Instructor',
      scheduledStart: request.session?.scheduledStart,
      scheduledEnd: request.session?.scheduledEnd,
      lesson: request.session?.enrollment?.packageNameAtEnrollment || 'Lesson',
      roomName: request.session?.room?.resource?.name || request.session?.room?.resourceId || null,
      generatedOptions: request.metadata?.generatedOptions || [],
      instructorChoices: request.metadata?.instructorChoices || [],
      studentChoices: request.metadata?.studentChoices || [],
      workflowStatus: request.metadata?.workflowStatus || 'PENDING',
    })).filter((request) => request.status === 'PENDING' && request.scheduledStart && new Date(request.scheduledStart) >= todayInManila);
  },
  async emergencyReschedule(appId, data = {}) {
    const sessionIds = Array.isArray(data.sessionIds) ? [...new Set(data.sessionIds.filter(Boolean))] : [];
    const start = new Date(data.targetStart);
    const end = new Date(data.targetEnd);
    if (!sessionIds.length || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
      throw new BadRequestError('Affected sessions and a valid replacement schedule are required.');
    }
    const result = await enrollmentRepository.emergencyRescheduleSessions(appId, sessionIds, start, end);
    if (!result) throw new NotFoundError('One or more affected class schedules were not found.');
    return result;
  },
  async getEnrollments(appId, filters = {}) {
    const enrollments = await enrollmentRepository.findAll(
      appId,
      filters,
    );

    return { ...enrollments, items: enrollments.items.map(mapEnrollment) };
  },

  async getAvailablePackages(appId, customerId) {
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

    const requiredSessionsPerWeek = Number(packageItem.sessionsPerWeek);
    const eligibleInstructors = await Promise.all(
      instructors.map(async (instructor) => {
        // Full-time instructors use the operating-hour schedule. Part-time
        // instructors must have enough distinct submitted days for this package.
        if (
          isFullTimeInstructor(instructor) ||
          !Number.isInteger(requiredSessionsPerWeek) ||
          requiredSessionsPerWeek <= 0
        ) {
          return instructor;
        }

        const submittedAvailability =
          await enrollmentRepository.findInstructorAvailability(
            appId,
            instructor.id,
          );
        const submittedDays = new Set(
          submittedAvailability.map((rule) => Number(rule.dayOfWeek)),
        );

        return submittedDays.size >= requiredSessionsPerWeek
          ? instructor
          : null;
      }),
    );

    return eligibleInstructors.filter(Boolean).map(mapInstructor);
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

    const operatingHours = isFullTimeInstructor(instructor)
      ? await settingsService.getOperatingHours(appId)
      : null;

    let availability = isFullTimeInstructor(instructor)
      ? getFullTimeAvailability(
          operatingHours,
          packageItem.sessionDurationMinutes,
        )
      : await enrollmentRepository.findInstructorAvailability(
          appId,
          instructorId,
        );

    availability = availability.filter(
      (rule) => rule.endMinute - rule.startMinute >= requiredDuration,
    );

    if (!startDate) {
      const futureSessions = await enrollmentRepository.findInstructorFutureSessions(
        appId,
        instructorId,
      );
      availability = availability.filter((rule) => !futureSessions.some((session) => {
        const sessionStart = new Date(session.scheduledStart);
        const sessionEnd = new Date(session.scheduledEnd);
        return getDayOfWeek(sessionStart) === Number(rule.dayOfWeek) &&
          getMinuteOfDay(sessionStart) < Number(rule.endMinute) &&
          getMinuteOfDay(sessionEnd) > Number(rule.startMinute);
      }));
    }

    if (startDate) {
      const dateKey = getManilaDateKey(startDate);
      const dateStart = new Date(`${dateKey}T12:00:00+08:00`);
      if (Number.isNaN(dateStart.getTime())) {
        throw new BadRequestError('Invalid start date.');
      }
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
          const sessionDateKey = addDaysToManilaDateKey(
            dateKey,
            dayOffset + week * 7,
          );
          const sessionStart = createManilaDateTime(
            sessionDateKey,
            rule.startMinute,
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

    if (isFullTimeInstructor(instructor)) {
      const operatingHours = await settingsService.getOperatingHours(appId);

      try {
        assertWithinOperatingHours(operatingHours, startsAt, endsAt);
      } catch (error) {
        throw new BadRequestError(error.message);
      }
    } else {
      const availability = await enrollmentRepository.findInstructorAvailability(
        appId,
        instructor.id,
      );

      const matchingAvailability = availability.find(
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
    const customer = await enrollmentRepository.findCustomerProfile(appId, customerId);
    const person = customer?.person;
    const details = person?.metadata?.studentDetails || {};
    const address = typeof person?.address === 'string'
      ? person.address
      : person?.address?.line1 || person?.address?.fullAddress || '';
    if (
      !person?.firstName?.trim() ||
      !person?.lastName?.trim() ||
      !(person?.user?.email || person?.email)?.trim() ||
      !person?.phone?.trim() ||
      !String(address).trim() ||
      !Number.isFinite(Number(details.age)) ||
      Number(details.age) <= 0 ||
      !details.gender ||
      !String(details.guardianName || '').trim()
    ) {
      throw new BadRequestError(
        'Complete your required Account profile details before enrolling.',
      );
    }

    const paymentReference = data.metadata?.paymentReference;

    if (
      typeof paymentReference !== 'string' ||
      paymentReference.trim().length < 13 ||
      paymentReference.trim().length > 100 ||
      !/^[a-z0-9]+$/i.test(paymentReference.trim())
    ) {
      throw new BadRequestError(
        'A valid payment reference is required before submitting an enrollment.',
      );
    }

    const normalizedPaymentReference = await assertUnusedPaymentReference(appId, paymentReference, { minLength: 13, maxLength: 100, alphanumericOnly: true });

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
    const operatingHours = await settingsService.getOperatingHours(appId);

    for (const session of data.sessions) {
      let adjustedSession = moveOutsideHoursToNextWeek(session, operatingHours);
      while (overlapsExistingSession(adjustedSession, validatedSessions)) {
        adjustedSession = moveSessionOneWeek(adjustedSession);
      }
      const validated =
        await this.validateSession(
          appId,
          packageItem,
          adjustedSession,
          courseId,
        );

      const conflictingCustomerSession = await enrollmentRepository.findConflictingCustomerSession(
        appId,
        customerId,
        validated.startsAt,
        validated.endsAt,
      );
      if (conflictingCustomerSession) {
        throw new ConflictError('Your selected session overlaps an existing enrollment.');
      }

      try {
        assertWithinOperatingHours(operatingHours, validated.startsAt, validated.endsAt);
      } catch (error) {
        throw new BadRequestError(error.message);
      }

      validatedSessions.push({
        instructorId:
          adjustedSession.instructorId,
        roomId:
          adjustedSession.roomId || null,
        scheduledStart:
          validated.startsAt,
        scheduledEnd:
          validated.endsAt,
        status: 'SCHEDULED',
        metadata:
          adjustedSession.metadata || null,
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
      priceAtEnrollment: Number(packageItem.price),
      packageNameAtEnrollment: packageItem.name,
      numberOfSessionsAtEnrollment: packageItem.numberOfSessions,
      sessionDurationMinutesAtEnrollment: packageItem.sessionDurationMinutes,
      sessionsPerWeekAtEnrollment: packageItem.sessionsPerWeek,
      termsSnapshot: {
        packageId: packageItem.id,
        packageName: packageItem.name,
        price: Number(packageItem.price),
        numberOfSessions: packageItem.numberOfSessions,
        sessionDurationMinutes: packageItem.sessionDurationMinutes,
        sessionsPerWeek: packageItem.sessionsPerWeek,
        courseId: data.metadata?.courseId || null,
      },
      status: 'FOR_APPROVAL',
      paymentObligationId:
        data.paymentObligationId || null,
      paymentExpiresAt:
        data.paymentExpiresAt
          ? new Date(data.paymentExpiresAt)
          : null,
      enrolledAt: null,
      metadata: {
        ...(data.metadata || {}),
        paymentPlan: data.metadata?.paymentPlan === 'DOWN_PAYMENT' ? 'DOWN_PAYMENT' : 'FULL_PAYMENT',
        paymentMethod: 'QR',
        paymentStatus: 'PENDING_CONFIRMATION',
        paymentAmount: Number(packageItem.price) * (data.metadata?.paymentPlan === 'DOWN_PAYMENT' ? 0.5 : 1),
        initialPaymentAmount: Number(packageItem.price) * (data.metadata?.paymentPlan === 'DOWN_PAYMENT' ? 0.5 : 1),
        remainingAmount: Number(packageItem.price) * (data.metadata?.paymentPlan === 'DOWN_PAYMENT' ? 0.5 : 1),
        paymentReference: normalizedPaymentReference,
      },
      sessions: validatedSessions,
    });
  },

  async validateSchedule(appId, data, customerId = null) {
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

    const operatingHours = await settingsService.getOperatingHours(appId);
    const validatedScheduleSessions = [];

    for (const session of data.sessions) {
      let adjustedSession = moveOutsideHoursToNextWeek(session, operatingHours);
      while (overlapsExistingSession(adjustedSession, validatedScheduleSessions)) {
        adjustedSession = moveSessionOneWeek(adjustedSession);
      }
      const validated = await this.validateSession(
        appId,
        packageItem,
        adjustedSession,
        courseId,
      );
      try {
        assertWithinOperatingHours(operatingHours, validated.startsAt, validated.endsAt);
      } catch (error) {
        throw new BadRequestError(error.message);
      }

      if (customerId) {
        const conflict = await enrollmentRepository.findConflictingCustomerSession(
          appId,
          customerId,
          validated.startsAt,
          validated.endsAt,
        );
        if (conflict) {
          throw new ConflictError('Your selected session overlaps an existing enrollment.');
        }
      }

      validatedScheduleSessions.push({
        instructorId: adjustedSession.instructorId,
        scheduledStart: validated.startsAt,
        scheduledEnd: validated.endsAt,
      });
    }

    return { valid: true, courseId, configuredCourseCount: configuredLessons.length };
  },

  async getMyEnrollment(
    appId,
    customerId,
  ) {
    const enrollments =
      await enrollmentRepository.findMyEnrollment(
        appId,
        customerId,
      );

    return enrollments.map(mapEnrollment);
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

  async approveEnrollment(appId, enrollmentId) {
    const enrollments = (await enrollmentRepository.findAll(appId, {
      status: 'FOR_APPROVAL',
    })).items;
    const enrollment = enrollments.find((item) => item.id === enrollmentId);

    if (!enrollment) {
      throw new NotFoundError('Enrollment waiting for approval was not found.');
    }

    const metadata = enrollment.metadata || {};
    const paymentPlan = metadata.paymentPlan === 'DOWN_PAYMENT'
      ? 'DOWN_PAYMENT'
      : 'FULL_PAYMENT';
    const paymentAmount = Number(metadata.paymentAmount || 0);
    const totalAmount = Number(
      enrollment.priceAtEnrollment ?? enrollment.lessonPackage?.price ?? 0,
    );
    const paymentContinuationRequired = paymentPlan === 'DOWN_PAYMENT';
    const paymentStatus = paymentAmount >= totalAmount
      ? 'PAID'
      : paymentAmount > 0
        ? 'PARTIALLY_PAID'
        : 'PENDING_PAYMENT';

    const approved = await enrollmentRepository.updateStaffDecision(
      appId,
      enrollmentId,
      {
        status: 'APPROVED',
        enrolledAt: new Date(),
        metadata: {
          ...metadata,
          approvalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          paymentPlan,
          paymentContinuationRequired,
          paymentContinuationStatus: paymentContinuationRequired
            ? 'PENDING'
            : 'NOT_REQUIRED',
          paymentStatus,
          ...(paymentStatus === 'PAID'
            ? { paymentCompletedAt: new Date().toISOString() }
            : {}),
          paymentBalanceDue: paymentContinuationRequired
            ? Math.max(totalAmount - paymentAmount, 0)
            : 0,
        },
      },
    );

    if (!approved) {
      throw new ConflictError('This enrollment has already been processed.');
    }

    return mapEnrollment(approved);
  },

  async cancelStaffEnrollment(appId, enrollmentId, reason) {
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
      throw new BadRequestError('Cancellation reason must be between 3 and 500 characters.');
    }
    const enrollments = (await enrollmentRepository.findAll(appId, {
      status: 'FOR_APPROVAL',
    })).items;
    const enrollment = enrollments.find((item) => item.id === enrollmentId);

    if (!enrollment) {
      throw new NotFoundError('Enrollment waiting for approval was not found.');
    }

    const cancelled = await enrollmentRepository.updateStaffDecision(
      appId,
      enrollmentId,
      {
        status: 'CANCELLED',
        metadata: {
          ...(enrollment.metadata || {}),
          approvalStatus: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason.trim(),
        },
      },
    );

    if (!cancelled) {
      throw new ConflictError('This enrollment has already been processed.');
    }

    return mapEnrollment(cancelled);
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
