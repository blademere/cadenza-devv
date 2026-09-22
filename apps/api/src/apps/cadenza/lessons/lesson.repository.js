import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listPackages = (appId, db = prisma) => db.cadenzaLessonPackage.findMany({ where: { appId }, orderBy: { createdAt: 'desc' } })
const createPackage = ({ appId, name, description, price, numberOfSessions }, db = prisma) => db.cadenzaLessonPackage.create({ data: { appId, name, description, price, numberOfSessions } })
const updatePackage = (id, appId, data, db = prisma) => db.cadenzaLessonPackage.updateMany({ where: { id, appId }, data })
const createAttachment = (data, db = prisma) => db.cadenzaLessonAttachment.create({ data })
const listAttachments = (lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.findMany({ where: { lessonPackageId, lessonPackage: { appId } }, orderBy: { createdAt: 'asc' } })
const findAttachment = (id, lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.findFirst({ where: { id, lessonPackageId, lessonPackage: { appId } } })
const deleteAttachment = (id, lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.deleteMany({ where: { id, lessonPackageId, lessonPackage: { appId } } })
const findStudent = (id, appId) => prisma.cadenzaStudent.findFirst({ where: { id, appId }, include: { person: true } })
const findStudentForActor = (actorId, appId, db = prisma) => db.cadenzaStudent.findFirst({ where: { appId, person: { userId: Number(actorId) } }, include: { person: true } })
const findPackage = (id, appId) => prisma.cadenzaLessonPackage.findFirst({ where: { id, appId } })
const createEnrollment = (data, db = prisma) => db.cadenzaEnrollment.create({ data })
const attachPaymentObligation = (id, appId, paymentObligationId, db = prisma) => db.cadenzaEnrollment.update({ where: { id }, data: { paymentObligationId }, include: { lessonPackage: true } })
const listEnrollments = (appId, db = prisma) => db.cadenzaEnrollment.findMany({ where: { appId }, include: { lessonPackage: true, student: { include: { person: true } }, sessions: { select: { status: true, attendance: { select: { status: true } } } } }, orderBy: { createdAt: 'desc' } })
const findEnrollmentById = (id, appId, db = prisma) => db.cadenzaEnrollment.findFirst({ where: { id, appId }, include: { lessonPackage: true, student: { include: { person: true } }, sessions: { orderBy: { scheduledStart: 'asc' }, include: { attendance: true, instructor: { include: { person: true } } } } } })
const confirmEnrollment = (id, appId, db = prisma) => db.cadenzaEnrollment.updateMany({ where: { id, appId, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED', enrolledAt: new Date(), paymentExpiresAt: null } })
const updateEnrollmentStatus = (id, appId, fromStatuses, status, db = prisma) => db.cadenzaEnrollment.updateMany({ where: { id, appId, status: { in: fromStatuses } }, data: { status } })
const findEnrollment = (id, appId, db = prisma) => db.cadenzaEnrollment.findFirst({ where: { id, appId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }, include: { lessonPackage: true, student: { include: { person: true } }, _count: { select: { sessions: true } } } })
const findEnrollmentForPackageActor = (lessonPackageId, actorId, appId, db = prisma) => db.cadenzaEnrollment.findFirst({ where: { appId, lessonPackageId, student: { person: { userId: Number(actorId) } }, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } })
const findInstructor = (id, appId, db = prisma) => db.cadenzaInstructor.findFirst({ where: { id, appId, status: 'ACTIVE' }, include: { person: true } })
const findRoom = (id, appId, db = prisma) => db.cadenzaRoom.findFirst({ where: { id, appId, status: 'AVAILABLE' } })
const findOverlappingSession = ({ appId, instructorId, roomId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { appId, status: { not: 'CANCELLED' }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}), OR: [...(instructorId ? [{ instructorId }] : []), ...(roomId ? [{ roomId }] : [])] } })
const findRoomRentalOverlap = ({ appId, roomResourceId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaRental.findFirst({ where: { appId, resourceId: roomResourceId, rentalType: 'ROOM', status: { in: ['PENDING', 'RESERVED', 'CHECKED_OUT'] }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) } })
const createSession = (data, db = prisma) => db.cadenzaLessonSession.create({ data })
const findSession = (id, appId, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { id, appId }, include: { attendance: true, instructor: { include: { person: true } }, enrollment: { include: { student: { include: { person: true } }, lessonPackage: true } } } })
const upsertAttendance = (sessionId, data, db = prisma) => db.cadenzaAttendance.upsert({ where: { sessionId }, create: { sessionId, ...data }, update: data })
const createReschedule = (data, db = prisma) => db.cadenzaRescheduleRequest.create({ data })
const findPendingReschedule = (sessionId, appId, db = prisma) => db.cadenzaRescheduleRequest.findFirst({ where: { sessionId, appId, status: 'PENDING' } })
const countReschedulesForSession = (sessionId, appId, db = prisma) => db.cadenzaRescheduleRequest.count({ where: { sessionId, appId, status: { not: 'CANCELLED' } } })
const findReschedule = (id, appId, db = prisma) => db.cadenzaRescheduleRequest.findFirst({ where: { id, appId } })
const listReschedules = (appId, db = prisma) => db.cadenzaRescheduleRequest.findMany({ where: { appId }, orderBy: { createdAt: 'desc' }, include: { session: { include: { enrollment: { include: { student: { include: { person: true } } } } } } } })
const updateReschedule = (id, appId, data, db = prisma) => db.cadenzaRescheduleRequest.updateMany({ where: { id, appId }, data })
const updateSession = (id, appId, data, db = prisma) => db.cadenzaLessonSession.updateMany({ where: { id, appId }, data })
const listSessionsForInstructorActor = (appId, userId, db = prisma) => db.cadenzaLessonSession.findMany({ where: { appId, instructor: { person: { userId: Number(userId) } } }, orderBy: { scheduledStart: 'asc' }, include: { attendance: true, enrollment: { include: { student: { include: { person: true } }, lessonPackage: true } }, instructor: { include: { person: true } } } })
const listSessions = (appId, db = prisma) => db.cadenzaLessonSession.findMany({ where: { appId }, orderBy: { scheduledStart: 'asc' }, include: { attendance: true, enrollment: { include: { student: { include: { person: true } }, lessonPackage: true } }, instructor: { include: { person: true } } } })

const findExpiredPendingEnrollments = (now = new Date(), db = prisma) =>
  db.cadenzaEnrollment.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      paymentExpiresAt: { lte: now },
    },
    select: { id: true, appId: true },
    orderBy: { paymentExpiresAt: 'asc' },
  })

const countConsumedSessions = (enrollmentId, appId, db = prisma) =>
  db.cadenzaLessonSession.count({
    where: {
      enrollmentId,
      appId,
      status: { in: ['SCHEDULED', 'COMPLETED', 'MISSED'] },
    },
  })

const findExpiredSessions = (now = new Date(), db = prisma) =>
  db.cadenzaLessonSession.findMany({
    where: { status: 'SCHEDULED', scheduledEnd: { lte: now } },
    select: { id: true, appId: true, enrollmentId: true },
    orderBy: { scheduledEnd: 'asc' },
  })

export { listPackages, createPackage, updatePackage, createAttachment, listAttachments, findAttachment, deleteAttachment, findStudent, findStudentForActor, findPackage, createEnrollment, attachPaymentObligation, listEnrollments, findEnrollmentById, confirmEnrollment, updateEnrollmentStatus, findEnrollment, findEnrollmentForPackageActor, findInstructor, findRoom, findOverlappingSession, findRoomRentalOverlap, createSession, findSession, upsertAttendance, createReschedule, findPendingReschedule, findReschedule, listReschedules, updateReschedule, updateSession, listSessions, listSessionsForInstructorActor, findExpiredPendingEnrollments, countConsumedSessions, findExpiredSessions }
