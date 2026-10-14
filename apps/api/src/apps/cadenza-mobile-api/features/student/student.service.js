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
    status: session.status,
    instructor: session.instructor?.person
      ? { name: [session.instructor.person.firstName, session.instructor.person.lastName].filter(Boolean).join(' ') }
      : null,
    room: session.room ? { name: session.room.resourceId } : null,
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

async function findApprovedEnrollments(appId, customerId) {
  return prisma.cadenzaEnrollment.findMany({
    where: { appId, customerId, status: 'APPROVED' },
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
          instructor: { select: { person: { select: { firstName: true, lastName: true } } } },
          room: { select: { resourceId: true } },
          rescheduleRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { scheduledStart: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export const studentService = {
  async getDashboard(req) {
    const enrollments = await findApprovedEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
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
    const enrollments = await findApprovedEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
    return {
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        packageName: enrollment.lessonPackage?.name,
        courseName: courseName(enrollment),
        status: enrollment.status,
      })),
      schedules: enrollments.flatMap((enrollment) => enrollment.sessions.map((session) => mapSession(session, enrollment))),
    };
  },

  async getMaterials(req) {
    const enrollments = await findApprovedEnrollments(req.cadenzaApp.id, req.cadenzaCustomer.id);
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
          if (group.materials.some((item) => item.id === material.id)) continue;
          group.materials.push({
            id: material.id,
            title: material.name,
            description: material.metadata?.description || '',
            type: material.type,
            status: material.metadata?.status || 'AVAILABLE',
            uploadedAt: material.createdAt,
            fileUrl: material.storageReference || null,
            courseId: lesson.id,
            courseName: lesson.name,
          });
        }

        groups.set(lesson.id, group);
      }
    }

    return { groups: [...groups.values()] };
  },

  async getMaterial(req, materialId) {
    const result = await this.getMaterials(req);
    const material = result.groups.flatMap((group) => group.materials).find((item) => item.id === materialId);

    if (!material) throw new NotFoundError('Material not found in the approved enrollments.');
    return material;
  },

  async requestSchedule(req, sessionId) {
    const session = await prisma.cadenzaLessonSession.findFirst({
      where: {
        id: sessionId,
        appId: req.cadenzaApp.id,
        enrollment: { customerId: req.cadenzaCustomer.id, status: 'APPROVED' },
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
        reason: 'Student requested a schedule change.',
      },
    });
  },
};
