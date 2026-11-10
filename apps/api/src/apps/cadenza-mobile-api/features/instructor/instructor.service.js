import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors/appError.js';
import bcrypt from 'bcrypt';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { getPrismaClient } from '../../../../infrastructure/database/prisma.js';

const prisma = getPrismaClient();
const COMPLETED_STATUSES = new Set(['PRESENT', 'LATE', 'COMPLETED', 'ATTENDED']);

async function getInstructor(req) {
  const instructor = await prisma.cadenzaInstructor.findFirst({
    where: {
      appId: req.cadenzaApp.id,
      person: { userId: Number(req.user.id) },
      status: 'ACTIVE',
    },
    include: { person: true },
  });

  if (instructor) return instructor;

  // Development and older Cadenza accounts may still be represented only by
  // CadenzaStaff(staffType=Instructor). Keep that account usable for reads by
  // resolving ownership through its Person record.
  if (
    req.cadenzaAccount?.type === 'STAFF'
    && String(req.cadenzaAccount.staffType || '').toUpperCase() === 'INSTRUCTOR'
    && req.cadenzaStaff?.person
  ) {
    return {
      id: null,
      personId: req.cadenzaStaff.personId,
      person: req.cadenzaStaff.person,
      legacyStaff: true,
    };
  }

  throw new ForbiddenError('An active instructor profile is required.');
}

function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Student';
}

function coursesForSession(session) {
  const legacyCourses = session.enrollment?.lessonPackage?.lessons || [];
  const mappedCourses = (session.enrollment?.lessonPackage?.courseMappings || [])
    .map((mapping) => mapping.course)
    .filter(Boolean);
  return [...legacyCourses, ...mappedCourses].filter(
    (course, index, allCourses) => allCourses.findIndex((item) => item.id === course.id) === index,
  );
}

function mapSession(session) {
  const courses = coursesForSession(session);
  const selectedCourseId = session.enrollment?.metadata?.courseId
    || session.enrollment?.termsSnapshot?.courseId;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || (courses.length === 1 ? courses[0] : null);

  return {
    id: session.id,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    rescheduled: session.metadata?.rescheduled === true,
    status: session.status,
    lesson: selectedCourse?.name || 'Lesson',
    courseName: selectedCourse?.name || 'Lesson',
    courseId: selectedCourse?.id || null,
    student: fullName(session.enrollment?.customer?.person),
    studentName: fullName(session.enrollment?.customer?.person),
    studentId: session.enrollment?.customerId,
    room: session.room ? { name: session.room.name || session.room.resourceId } : null,
    attendance: session.attendance
      ? {
          id: session.attendance.id,
          status: session.attendance.status,
          notes: session.attendance.notes,
          markedAt: session.attendance.markedAt,
        }
      : null,
    scheduleRequest: session.metadata?.rescheduled !== true && session.rescheduleRequests?.[0]
      ? {
          id: session.rescheduleRequests[0].id,
          status: session.rescheduleRequests[0].status,
          reason: session.rescheduleRequests[0].reason,
          rejectionReason: session.rescheduleRequests[0].metadata?.rejectionReason || null,
          reviewedAt: session.rescheduleRequests[0].reviewedAt,
          requestedStart: session.rescheduleRequests[0].requestedStart,
          requestedEnd: session.rescheduleRequests[0].requestedEnd,
          status: session.rescheduleRequests[0].status,
          generatedOptions: session.rescheduleRequests[0].metadata?.generatedOptions || [],
          instructorChoices: session.rescheduleRequests[0].metadata?.instructorChoices || [],
          studentChoice: session.rescheduleRequests[0].metadata?.studentChoice || null,
        }
      : null,
  };
}

async function findSessions(req) {
  const instructor = await getInstructor(req);
  const sessions = await prisma.cadenzaLessonSession.findMany({
    where: {
      appId: req.cadenzaApp.id,
      enrollment: { status: { in: ['APPROVED', 'ACTIVE', 'AT_RISK'] } },
      ...(instructor.id
        ? { instructorId: instructor.id }
        : { instructor: { personId: instructor.personId } }),
    },
    include: {
      attendance: true,
      enrollment: {
        include: {
          customer: { include: { person: true } },
          lessonPackage: {
            select: {
              name: true,
              lessons: { select: { id: true, name: true, materials: { select: { id: true, name: true, type: true, storageReference: true, metadata: true } } } },
              courseMappings: { select: { course: { select: { id: true, name: true, materials: { select: { id: true, name: true, type: true, storageReference: true, metadata: true } } } } } },
            },
          },
        },
      },
      room: { select: { resourceId: true, roomType: true } },
      rescheduleRequests: { where: { status: { in: ['PENDING', 'REJECTED'] } }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  const roomIds = [...new Set(sessions.map((session) => session.room?.resourceId).filter(Boolean))];
  if (!roomIds.length) return { instructor, sessions };
  const resources = await prisma.resource.findMany({ where: { appId: req.cadenzaApp.id, id: { in: roomIds } }, select: { id: true, name: true } });
  const names = new Map(resources.map((resource) => [resource.id, resource.name]));
  return { instructor, sessions: sessions.map((session) => session.room
    ? { ...session, room: { ...session.room, name: names.get(session.room.resourceId) || session.room.roomType || session.room.resourceId } }
    : session) };
}

function isToday(value) {
  return value && new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value)) === new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function progressByStudent(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const studentId = session.enrollment?.customerId;
    if (!studentId) continue;
    const group = groups.get(studentId) || {
      id: studentId,
      name: fullName(session.enrollment?.customer?.person),
      completedLessons: 0,
      totalLessons: 0,
      progress: 0,
      materials: [],
      courses: [],
      recordedAttendance: 0,
      attendedLessons: 0,
      absences: 0,
      lastLesson: null,
    };
    group.totalLessons += 1;
    const attendanceStatus = String(session.attendance?.status || '').toUpperCase();
    if (COMPLETED_STATUSES.has(attendanceStatus)) { group.completedLessons += 1; group.attendedLessons += 1; }
    if (['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'NO_SHOW', 'COMPLETED', 'ATTENDED'].includes(attendanceStatus)) group.recordedAttendance += 1;
    if (['ABSENT', 'NO_SHOW'].includes(attendanceStatus)) group.absences += 1;
    if (!group.lastLesson || new Date(session.scheduledStart) > new Date(group.lastLesson.scheduledStart)) group.lastLesson = { scheduledStart: session.scheduledStart, status: attendanceStatus || 'SCHEDULED' };
    group.progress = Math.round((group.completedLessons / group.totalLessons) * 100);
    const allCourses = coursesForSession(session);
    const selectedCourseId = session.enrollment?.metadata?.courseId || session.enrollment?.termsSnapshot?.courseId;
    const selectedCourse = allCourses.find((course) => course.id === selectedCourseId) || (allCourses.length === 1 ? allCourses[0] : null);
    const courses = selectedCourse ? [selectedCourse] : [];
    for (const course of courses) if (!group.courses.some((item) => item.id === course.id)) group.courses.push({ id: course.id, name: course.name });
    group.attendanceRate = group.recordedAttendance ? Math.round((group.attendedLessons / group.recordedAttendance) * 100) : 0;
    group.status = group.absences >= 2 ? 'NEEDS_ATTENTION' : 'ON_TRACK';
    const existingMaterialIds = new Set(group.materials.map((material) => material.id));
    for (const course of courses) {
      for (const material of course.materials || []) {
        if ((material.metadata?.status || 'AVAILABLE') !== 'AVAILABLE' || !material.storageReference) continue;
        if (existingMaterialIds.has(material.id)) continue;
        existingMaterialIds.add(material.id);
        group.materials.push({
          id: material.id,
          courseId: course.id,
          title: material.name,
          type: material.type,
          status: material.metadata?.status || 'AVAILABLE',
        });
      }
    }
    groups.set(studentId, group);
  }
  return [...groups.values()];
}

export const instructorService = {
  async getMaterials(req) {
    const { sessions } = await findSessions(req);
    const materials = new Map();
    for (const session of sessions) {
      const courses = [
        ...(session.enrollment?.lessonPackage?.lessons || []),
        ...(session.enrollment?.lessonPackage?.courseMappings || []).map((mapping) => mapping.course).filter(Boolean),
      ];
      for (const course of courses) for (const material of course.materials || []) {
        if ((material.metadata?.status || 'AVAILABLE') !== 'AVAILABLE' || !material.storageReference) continue;
        if (!materials.has(material.id)) materials.set(material.id, { id: material.id, title: material.name, type: material.type, status: material.metadata?.status || 'AVAILABLE', storageReference: material.storageReference, storedFileName: material.metadata?.storedFileName || null, courseId: course.id });
      }
    }
    return [...materials.values()].map(({ storageReference, ...material }) => ({ ...material, fileUrl: storageReference || null }));
  },
  async getMaterial(req, materialId) {
    const material = (await this.getMaterials(req)).find((item) => item.id === materialId);
    if (!material) throw new NotFoundError('Material not found in assigned courses.');
    return material;
  },
  async getMaterialFile(req, materialId) {
    const materials = await this.getMaterials(req);
    const material = materials.find((item) => item.id === materialId);
    if (!material?.fileUrl) throw new NotFoundError('Material file not found.');
    const root = path.resolve(process.env.CADENZA_STORAGE_PATH || path.join(process.cwd(), 'storage'));
    const normalized = String(material.fileUrl).replaceAll('\\', '/');
    if (path.isAbsolute(normalized) || normalized.split('/').includes('..')) throw new NotFoundError('Material file not found.');
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
    return { absolutePath, filename: material.title, contentType: material.type || 'application/octet-stream' };
  },
  async getDashboard(req) {
    const { instructor, sessions } = await findSessions(req);
    const today = sessions.filter((session) => isToday(session.scheduledStart));
    return {
      instructorName: fullName(instructor.person),
      stats: {
        assignedStudents: new Set(sessions.map((session) => session.enrollment?.customerId).filter(Boolean)).size,
        todaySessions: today.length,
      },
      todaySchedule: today.map((session) => ({
        ...mapSession(session),
        time: `${new Date(session.scheduledStart).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(session.scheduledEnd).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}`,
        location: mapSession(session).room?.name || null,
      })),
      studentProgress: progressByStudent(sessions),
    };
  },

  async getSchedule(req) {
    const { sessions } = await findSessions(req);
    const schedules = sessions.map(mapSession);
    return {
      schedules,
      courses: [...new Map(
        schedules
          .filter((schedule) => schedule.courseName && schedule.courseName !== 'Lesson')
          .map((schedule) => [schedule.courseId || schedule.courseName, { id: schedule.courseId || schedule.courseName, name: schedule.courseName }]),
      ).values()].sort((first, second) => first.name.localeCompare(second.name)),
    };
  },

  async getProgress(req) {
    const { sessions } = await findSessions(req);
    return { records: sessions.map(mapSession), studentProgress: progressByStudent(sessions) };
  },
  async updateProfile(req, data) {
    const instructor = await getInstructor(req);
    const person = await prisma.person.update({ where: { id: instructor.personId }, data: { firstName: data.firstName.trim(), middleName: data.middleName?.trim() || null, lastName: data.lastName.trim(), phone: data.phone?.trim() || null } });
    return { firstName: person.firstName, middleName: person.middleName, lastName: person.lastName, phone: person.phone, email: person.email };
  },
  async resetPassword(req, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: Number(req.user.id) } });
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new ConflictError('Current password is incorrect.');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    return { updated: true };
  },

  async recordAttendance(req, sessionId, status, notes = '') {
    const instructor = await getInstructor(req);
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: {
        id: sessionId,
        appId: req.cadenzaApp.id,
        ...(instructor.id
          ? { instructorId: instructor.id }
          : { instructor: { personId: instructor.personId } }),
      },
      include: { attendance: true, enrollment: { include: { customer: { include: { person: true } }, lessonPackage: { select: { name: true } } } }, room: { select: { resourceId: true } } },
    });
    if (!session) throw new NotFoundError('Instructor lesson session not found.');
    if (session.attendance?.notes?.trim()) throw new ConflictError('Instructor feedback has already been submitted and cannot be modified.');

    const attendance = await prisma.cadenzaAttendance.upsert({
      where: { sessionId },
      create: {
        sessionId,
        status,
        notes: notes || null,
        markedByPersonId: instructor.personId,
        markedAt: new Date(),
      },
      update: { status, notes: session.attendance?.notes || notes || null, markedByPersonId: instructor.personId, markedAt: new Date() },
    });

    // Two consecutive absences put the enrollment on the follow-up queue.
    // Keep the enrollment active until staff reviews it; attendance can still
    // be corrected and the student can be contacted or rescheduled.
    if (['ABSENT', 'NO_SHOW'].includes(String(status).toUpperCase())) {
      const recentSessions = await prisma.cadenzaLessonSession.findMany({
        where: {
          enrollmentId: session.enrollmentId,
          scheduledStart: { lte: session.scheduledStart },
        },
        orderBy: { scheduledStart: 'desc' },
        include: { attendance: { select: { status: true } } },
      });

      let consecutiveAbsences = 0;
      for (const recentSession of recentSessions) {
        if (['ABSENT', 'NO_SHOW'].includes(String(recentSession.attendance?.status || '').toUpperCase())) {
          consecutiveAbsences += 1;
        } else {
          break;
        }
      }

      if (consecutiveAbsences >= 2 && ['ACTIVE', 'APPROVED'].includes(session.enrollment.status)) {
        await prisma.cadenzaEnrollment.update({
          where: { id: session.enrollmentId },
          data: { status: 'AT_RISK' },
        });
      }
    }

    if (['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'NO_SHOW', 'COMPLETED', 'ATTENDED'].includes(String(status).toUpperCase())) {
      const recordedStatuses = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'NO_SHOW', 'COMPLETED', 'ATTENDED'];
      const [completedSessions, enrollment] = await Promise.all([
        prisma.cadenzaLessonSession.count({ where: { enrollmentId: session.enrollmentId, attendance: { status: { in: recordedStatuses } } } }),
        prisma.cadenzaEnrollment.findUnique({ where: { id: session.enrollmentId }, select: { status: true, numberOfSessionsAtEnrollment: true } }),
      ]);
      if (enrollment
        && enrollment.numberOfSessionsAtEnrollment > 0
        && completedSessions >= enrollment.numberOfSessionsAtEnrollment
        && ['ACTIVE', 'APPROVED', 'AT_RISK'].includes(enrollment.status)) {
        await prisma.cadenzaEnrollment.update({ where: { id: session.enrollmentId }, data: { status: 'READY_TO_COMPLETE' } });
      }
    }

    return { ...mapSession({ ...session, attendance }), attendance };
  },

  async saveFeedback(req, sessionId, notes = '') {
    const instructor = await getInstructor(req);
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: {
        id: sessionId,
        appId: req.cadenzaApp.id,
        ...(instructor.id ? { instructorId: instructor.id } : { instructor: { personId: instructor.personId } }),
      },
      include: { attendance: true },
    });
    if (!session) throw new NotFoundError('Instructor lesson session not found.');
    if (session.attendance?.notes?.trim()) throw new ConflictError('Instructor feedback has already been submitted and cannot be modified.');

    const attendance = await prisma.cadenzaAttendance.upsert({
      where: { sessionId },
      create: { sessionId, status: 'SCHEDULED', notes: notes.trim() || null, markedByPersonId: instructor.personId },
      update: { notes: notes.trim() || null, markedByPersonId: instructor.personId },
    });
    return { sessionId, feedback: attendance.notes, savedAt: attendance.markedAt };
  },

  async chooseSchedule(req, sessionId, optionIds) {
    const instructor = await getInstructor(req);
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: { id: sessionId, appId: req.cadenzaApp.id, ...(instructor.id ? { instructorId: instructor.id } : { instructor: { personId: instructor.personId } }) },
      include: { rescheduleRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const request = session?.rescheduleRequests?.[0];
    if (!request) throw new NotFoundError('Pending reschedule request not found.');
    const options = request.metadata?.generatedOptions || [];
    const uniqueOptionIds = [...new Set(optionIds)];
    const studentChoice = request.metadata?.studentChoice;
    if (!studentChoice) throw new ConflictError('The student must choose a generated schedule first.');
    if (!optionIds?.length) throw new ConflictError('Select the student schedule to adapt.');
    if (optionIds.some((optionId) => optionId !== studentChoice)) throw new ConflictError('The instructor can only adapt the schedule chosen by the student.');
    if (uniqueOptionIds.some((optionId) => !options.some((option) => option.id === optionId))) throw new ConflictError('One or more selected schedules are not generated options.');
    if (request.metadata?.instructorChoices?.length) throw new ConflictError('Instructor schedule choices have already been submitted.');
    const metadata = { ...(request.metadata || {}), instructorChoices: uniqueOptionIds, workflowStatus: 'AWAITING_FRONT_DESK_CONFIRMATION' };
    return prisma.cadenzaRescheduleRequest.update({ where: { id: request.id }, data: { metadata } });
  },

  async requestReschedule(req, sessionId, requestedStart, reason = '') {
    const instructor = await getInstructor(req);
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: {
        id: sessionId,
        appId: req.cadenzaApp.id,
        ...(instructor.id
          ? { instructorId: instructor.id }
          : { instructor: { personId: instructor.personId } }),
      },
      include: { rescheduleRequests: { where: { status: 'PENDING' }, take: 1 } },
    });
    if (!session) throw new NotFoundError('Instructor lesson session not found.');
    if (session.rescheduleRequests.length) throw new ConflictError('A reschedule request is already pending Front Desk review.');

    const start = new Date(requestedStart);
    if (Number.isNaN(start.getTime()) || start <= new Date()) throw new ConflictError('The requested start time must be in the future.');
    const duration = new Date(session.scheduledEnd).getTime() - new Date(session.scheduledStart).getTime();
    const end = new Date(start.getTime() + duration);

    return prisma.cadenzaRescheduleRequest.create({
      data: {
        appId: req.cadenzaApp.id,
        sessionId,
        requestedByPersonId: instructor.personId,
        requestedStart: start,
        requestedEnd: end,
        status: 'PENDING',
        reason: reason.trim() || 'Instructor requested a schedule change.',
      },
    });
  },
};
