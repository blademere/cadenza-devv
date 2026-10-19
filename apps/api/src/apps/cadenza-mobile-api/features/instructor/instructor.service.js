import { ConflictError, ForbiddenError, NotFoundError } from '../../../../common/errors/appError.js';
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

function mapSession(session) {
  return {
    id: session.id,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    status: session.status,
    lesson: session.enrollment?.lessonPackage?.name || 'Lesson',
    student: fullName(session.enrollment?.customer?.person),
    studentName: fullName(session.enrollment?.customer?.person),
    studentId: session.enrollment?.customerId,
    room: session.room ? { name: session.room.resourceId } : null,
    attendance: session.attendance
      ? {
          id: session.attendance.id,
          status: session.attendance.status,
          notes: session.attendance.notes,
          markedAt: session.attendance.markedAt,
        }
      : null,
    scheduleRequest: session.rescheduleRequests?.[0]
      ? {
          id: session.rescheduleRequests[0].id,
          status: session.rescheduleRequests[0].status,
          requestedStart: session.rescheduleRequests[0].requestedStart,
          requestedEnd: session.rescheduleRequests[0].requestedEnd,
        }
      : null,
  };
}

async function findSessions(req) {
  const instructor = await getInstructor(req);
  const sessions = await prisma.cadenzaLessonSession.findMany({
    where: {
      appId: req.cadenzaApp.id,
      ...(instructor.id
        ? { instructorId: instructor.id }
        : { instructor: { personId: instructor.personId } }),
    },
    include: {
      attendance: true,
      enrollment: {
        include: {
          customer: { include: { person: true } },
          lessonPackage: { select: { name: true } },
        },
      },
      room: { select: { resourceId: true } },
      rescheduleRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  return { instructor, sessions };
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
    };
    group.totalLessons += 1;
    if (COMPLETED_STATUSES.has(String(session.attendance?.status || '').toUpperCase())) group.completedLessons += 1;
    group.progress = Math.round((group.completedLessons / group.totalLessons) * 100);
    groups.set(studentId, group);
  }
  return [...groups.values()];
}

export const instructorService = {
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
        time: new Date(session.scheduledStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        location: session.room?.resourceId || null,
      })),
      studentProgress: progressByStudent(sessions),
    };
  },

  async getSchedule(req) {
    const { sessions } = await findSessions(req);
    return { schedules: sessions.map(mapSession) };
  },

  async getProgress(req) {
    const { sessions } = await findSessions(req);
    return { records: sessions.map(mapSession), studentProgress: progressByStudent(sessions) };
  },

  async recordAttendance(req, sessionId, status, notes = '') {
    const { instructor } = await getInstructor(req);
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

    const attendance = await prisma.cadenzaAttendance.upsert({
      where: { sessionId },
      create: { sessionId, status, notes: notes || null, markedByPersonId: instructor.personId },
      update: { status, notes: notes || null, markedByPersonId: instructor.personId, markedAt: new Date() },
    });
    return { ...mapSession({ ...session, attendance }), attendance };
  },

  async requestReschedule(req, sessionId, requestedStart, reason = '') {
    const { instructor } = await getInstructor(req);
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
