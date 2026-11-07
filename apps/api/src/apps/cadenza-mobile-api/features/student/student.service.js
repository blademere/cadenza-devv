import path from 'node:path';
import { access } from 'node:fs/promises';
import { ConflictError, NotFoundError } from '../../../../common/errors/appError.js';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();

function courseName(enrollment) {
  return getEnrollmentCourses(enrollment).map((course) => course.name).filter(Boolean).join(', ')
    || 'Course pending selection';
}

function getEnrollmentCourses(enrollment) {
  const legacyCourses = enrollment.lessonPackage?.lessons || [];
  const mappedCourses = (enrollment.lessonPackage?.courseMappings || [])
    .map((mapping) => mapping.course)
    .filter(Boolean);

  const courses = [...legacyCourses, ...mappedCourses].filter(
    (course, index, courses) => courses.findIndex((item) => item.id === course.id) === index,
  );

  const selectedCourseId = enrollment.metadata?.courseId;

  if (selectedCourseId) {
    return courses.filter((course) => course.id === selectedCourseId);
  }

  return courses.length === 1 ? courses : [];
}

function mapSession(session, enrollment) {
  return {
    id: session.id,
    enrollmentId: enrollment.id,
    courseName: courseName(enrollment),
    lesson: courseName(enrollment),
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    rescheduled: session.metadata?.rescheduled === true,
    status: session.status,
    attendance: session.attendance
      ? {
          id: session.attendance.id,
          status: session.attendance.status,
          notes: session.attendance.notes,
          markedAt: session.attendance.markedAt,
        }
      : null,
    instructor: session.instructor?.person
      ? { name: [session.instructor.person.firstName, session.instructor.person.lastName].filter(Boolean).join(' ') }
      : null,
    room: session.room ? { name: session.room.name || session.room.resourceId } : null,
    scheduleRequest: session.rescheduleRequests?.[0]
      ? {
          id: session.rescheduleRequests[0].id,
          status: session.rescheduleRequests[0].status,
          requestedStart: session.rescheduleRequests[0].requestedStart,
          requestedEnd: session.rescheduleRequests[0].requestedEnd,
          reason: session.rescheduleRequests[0].reason,
          generatedOptions: session.rescheduleRequests[0].metadata?.generatedOptions || [],
          instructorChoices: session.rescheduleRequests[0].metadata?.instructorChoices || [],
          studentChoices: session.rescheduleRequests[0].metadata?.studentChoices || [],
          studentChoice: session.rescheduleRequests[0].metadata?.studentChoice || null,
        }
      : null,
  };
}

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function mapEnrollmentSchedule(enrollment) {
  const sessions = [...(enrollment.sessions || [])]
    .sort((first, second) => new Date(first.scheduledStart) - new Date(second.scheduledStart));
  const firstStart = sessions[0] ? new Date(sessions[0].scheduledStart).getTime() : null;
  const sessionsPerWeek = Number(enrollment.sessionsPerWeekAtEnrollment ?? enrollment.lessonPackage?.sessionsPerWeek ?? 0) || null;
  const weeklySlots = new Map();

  const mappedSessions = sessions.map((session) => {
    const start = new Date(session.scheduledStart);
    const end = new Date(session.scheduledEnd);
    const parts = MANILA_DATE_FORMATTER.formatToParts(start).reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    const dayTime = `${parts.weekday}|${parts.hour}:${parts.minute}`;
    const week = firstStart === null
      ? 1
      : Math.floor((start.getTime() - firstStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const slot = weeklySlots.get(dayTime) || {
      dayOfWeek: parts.weekday,
      startTime: `${parts.hour}:${parts.minute}`,
      endTime: MANILA_DATE_FORMATTER.formatToParts(end).filter((part) => part.type === 'hour' || part.type === 'minute').map((part) => part.value).join(':'),
      sessions: 0,
    };
    slot.sessions += 1;
    weeklySlots.set(dayTime, slot);
    return { ...mapSession(session, enrollment), week, dayOfWeek: parts.weekday, startTime: `${parts.hour}:${parts.minute}` };
  });

  return {
    sessionsPerWeek,
    totalSessions: mappedSessions.length,
    weeklySlots: [...weeklySlots.values()],
    weeks: mappedSessions.reduce((groups, session) => {
      const group = groups.find((item) => item.week === session.week);
      if (group) group.sessions.push(session);
      else groups.push({ week: session.week, sessions: [session] });
      return groups;
    }, []),
    sessions: mappedSessions,
  };
}

const ACTIVE_ENROLLMENT_STATUS_FILTER = {
  notIn: ['FOR_APPROVAL', 'COMPLETED', 'CANCELLED', 'REJECTED'],
};

async function findActiveEnrollments(appId, customerId) {
  const enrollments = await prisma.cadenzaEnrollment.findMany({
    where: { appId, customerId, status: ACTIVE_ENROLLMENT_STATUS_FILTER },
    include: {
      lessonPackage: {
        select: {
          name: true,
          metadata: true,
          lessons: {
            select: {
              id: true,
              name: true,
              materials: {
                select: { id: true, name: true, type: true, storageReference: true, metadata: true, createdAt: true, updatedAt: true },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          courseMappings: {
            select: {
              course: {
                select: {
                  id: true,
                  name: true,
                  materials: {
                    select: { id: true, name: true, type: true, storageReference: true, metadata: true, createdAt: true, updatedAt: true },
                    orderBy: { createdAt: 'asc' },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      sessions: {
        include: {
          attendance: true,
          instructor: { select: { person: { select: { firstName: true, lastName: true } } } },
          room: { select: { resourceId: true, roomType: true } },
          rescheduleRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { scheduledStart: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  const roomIds = [...new Set(enrollments.flatMap((enrollment) => enrollment.sessions.map((session) => session.room?.resourceId).filter(Boolean)))];
  if (!roomIds.length) return enrollments;
  const resources = await prisma.resource.findMany({ where: { appId, id: { in: roomIds } }, select: { id: true, name: true } });
  const names = new Map(resources.map((resource) => [resource.id, resource.name]));
  return enrollments.map((enrollment) => ({
    ...enrollment,
    sessions: enrollment.sessions.map((session) => session.room
      ? { ...session, room: { ...session.room, name: names.get(session.room.resourceId) || session.room.roomType || session.room.resourceId } }
      : session),
  }));
}

export const studentService = {
  async getDashboard(req) {
    const enrollments = await findActiveEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
    const sessions = enrollments.flatMap((enrollment) => enrollment.sessions.map((session) => mapSession(session, enrollment)));

    return {
      student: req.cadenzaCustomer.person,
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        packageName: enrollment.lessonPackage?.name,
        courseName: courseName(enrollment),
        status: enrollment.status,
      })),
      enrollment: enrollments[0]
        ? {
            id: enrollments[0].id,
            packageName: enrollments[0].lessonPackage?.name,
            courseName: courseName(enrollments[0]),
            status: enrollments[0].status,
            instructorName: sessions[0]?.instructor?.name || null,
            scheduleDays: [...new Set(sessions.filter((session) => session.scheduledStart).map((session) => new Date(session.scheduledStart).toLocaleDateString(undefined, { weekday: 'long' })))],
          }
        : null,
      upcomingClasses: sessions,
    };
  },

  async getSchedule(req) {
    const enrollments = await findActiveEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
    return {
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        packageName: enrollment.lessonPackage?.name,
        courseName: courseName(enrollment),
        status: enrollment.status,
      })),
      schedules: enrollments.flatMap((enrollment) => enrollment.sessions.map((session) => mapSession(session, enrollment))),
      scheduleGroups: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        courseName: courseName(enrollment),
        schedule: mapEnrollmentSchedule(enrollment),
      })),
    };
  },

  async getProgress(req) {
    const enrollments = await findActiveEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
    const records = enrollments
      .flatMap((enrollment) => enrollment.sessions.map((session) => ({
        ...mapSession(session, enrollment),
        lesson: courseName(enrollment),
      })))
      .sort((a, b) => new Date(b.scheduledStart) - new Date(a.scheduledStart));
    const completedStatuses = new Set(['PRESENT', 'LATE', 'COMPLETED', 'ATTENDED']);
    const completedLessons = records.filter((record) => completedStatuses.has(String(record.attendance?.status || '').toUpperCase())).length;
    const feedback = records
      .filter((record) => record.attendance?.notes)
      .map((record) => ({
        id: record.attendance.id,
        attendanceId: record.attendance.id,
        message: record.attendance.notes,
        createdAt: record.attendance.markedAt,
        instructor: record.instructor,
        lesson: record.lesson,
      }));

    return {
      overallProgress: records.length ? Math.round((completedLessons / records.length) * 100) : 0,
      completedLessons,
      totalLessons: records.length,
      records,
      feedback,
    };
  },

  async getMaterials(req) {
    const enrollments = await findActiveEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
    const groups = new Map();

    for (const enrollment of enrollments) {
      for (const lesson of getEnrollmentCourses(enrollment)) {
        const group = groups.get(lesson.id) || {
          courseId: lesson.id,
          courseName: lesson.name,
          packages: [],
          materials: [],
        };

        if (enrollment.lessonPackage?.name && !group.packages.includes(enrollment.lessonPackage.name)) {
          group.packages.push(enrollment.lessonPackage.name);
        }

        for (const material of lesson.materials || []) {
          if ((material.metadata?.status || 'AVAILABLE') !== 'AVAILABLE' || !material.storageReference) continue;
          if (group.materials.some((item) => item.id === material.id)) continue;
          group.materials.push({
            id: material.id,
            title: material.name,
            description: material.metadata?.description || '',
            type: material.type,
            status: material.metadata?.status || 'AVAILABLE',
            uploadedAt: material.createdAt,
            fileUrl: material.storageReference || null,
            storedFileName: material.metadata?.storedFileName || null,
            courseId: lesson.id,
            courseName: lesson.name,
          });
        }

        groups.set(lesson.id, group);
      }
    }

    return { groups: [...groups.values()] };
  },

  async getMaterialFile(req, materialId) {
    const material = await this.getMaterial(req, materialId);
    if (!material.fileUrl) throw new NotFoundError('Material file not found.');
    const root = path.resolve(process.env.CADENZA_STORAGE_PATH || path.join(process.cwd(), 'storage'));
    const normalized = String(material.fileUrl).replaceAll('\\', '/');
    if (path.isAbsolute(normalized) || normalized.split('/').includes('..')) {
      throw new NotFoundError('Material file not found.');
    }
    let absolutePath = path.resolve(root, normalized);
    if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new NotFoundError('Material file not found.');
    try {
      await access(absolutePath);
    } catch {
      const fallbackPath = material.courseId && material.storedFileName
        ? path.resolve(root, 'cadenza-client', 'courses', material.courseId, material.storedFileName)
        : null;
      if (!fallbackPath || !fallbackPath.startsWith(`${root}${path.sep}`)) throw new NotFoundError('Material file not found.');
      try { await access(fallbackPath); } catch { throw new NotFoundError('Material file not found.'); }
      absolutePath = fallbackPath;
    }
    return { absolutePath, filename: material.title || 'material', contentType: material.type || 'application/octet-stream' };
  },

  async getMaterial(req, materialId) {
    const result = await this.getMaterials(req);
    const material = result.groups.flatMap((group) => group.materials).find((item) => item.id === materialId);

    if (!material) throw new NotFoundError('Material not found in the approved enrollments.');
    return material;
  },

  async requestSchedule(req, sessionId, reason) {
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: {
        id: sessionId,
        appId: req.cadenzaApp.id,
        enrollment: { customerId: req.cadenzaCustomer.id, status: ACTIVE_ENROLLMENT_STATUS_FILTER },
      },
      include: { rescheduleRequests: { where: { status: 'PENDING' }, take: 1 } },
    });

    if (!session) throw new NotFoundError('Approved lesson session not found.');
    if (session.rescheduleRequests.length) throw new ConflictError('A schedule request is already pending review.');

    return prisma.cadenzaRescheduleRequest.create({
      data: {
        appId: req.cadenzaApp.id,
        sessionId: session.id,
        requestedByPersonId: req.cadenzaCustomer.personId,
        requestedStart: session.scheduledStart,
        requestedEnd: session.scheduledEnd,
        status: 'PENDING',
        reason: reason.trim(),
      },
    });
  },

  async chooseSchedule(req, sessionId, optionId) {
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: { id: sessionId, appId: req.cadenzaApp.id, enrollment: { customerId: req.cadenzaCustomer.id, status: ACTIVE_ENROLLMENT_STATUS_FILTER } },
      include: { rescheduleRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const request = session?.rescheduleRequests?.[0];
    if (!request) throw new NotFoundError('Pending reschedule request not found.');
    const options = request.metadata?.generatedOptions || [];
    if (!options.some((option) => option.id === optionId)) throw new ConflictError('The selected schedule is not a generated option.');
    if (request.metadata?.studentChoice) throw new ConflictError('A student schedule choice has already been submitted.');
    return prisma.cadenzaRescheduleRequest.update({
      where: { id: request.id },
      data: { metadata: { ...(request.metadata || {}), studentChoice: optionId, workflowStatus: 'AWAITING_INSTRUCTOR_ADAPTATION' } },
    });
  },

};
