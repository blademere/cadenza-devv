import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { BLOCKING_LESSON_SESSION_STATUSES, BLOCKING_RENTAL_STATUSES } from '../cadenza.constants.js'

const prisma = getPrismaClient()

const hydrateSessionRoom = async (session, db = prisma) => {
  if (!session) return session
  if (!session.roomId) return { ...session, room: null, resource: null }
  const room = await db.cadenzaRoom.findFirst({
    where: { id: session.roomId, appId: session.appId },
  })
  if (!room) return { ...session, room: null, resource: null }
  const resource = await db.resource.findFirst({
    where: { id: room.resourceId, appId: room.appId },
  })
  return { ...session, room: { ...room, resource }, resource }
}

const hydrateSessions = async (sessions, db = prisma) =>
  Promise.all((sessions || []).map((session) => hydrateSessionRoom(session, db)))

const listPackages = (appId, db = prisma) => db.cadenzaLessonPackage.findMany({ where: { appId }, orderBy: { createdAt: 'desc' } })
const createPackage = ({ appId, name, description, price, numberOfSessions, sessionDurationMinutes = 60, sessionsPerWeek = 1 }, db = prisma) => db.cadenzaLessonPackage.create({ data: { appId, name, description, price, numberOfSessions, sessionDurationMinutes, sessionsPerWeek } })
const updatePackage = (id, appId, data, db = prisma) => db.cadenzaLessonPackage.updateMany({ where: { id, appId }, data })
const createAttachment = (data, db = prisma) => db.cadenzaLessonAttachment.create({ data })
const listAttachments = (lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.findMany({ where: { lessonPackageId, lessonPackage: { appId } }, orderBy: { createdAt: 'asc' } })
const findAttachment = (id, lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.findFirst({ where: { id, lessonPackageId, lessonPackage: { appId } } })
const deleteAttachment = (id, lessonPackageId, appId, db = prisma) => db.cadenzaLessonAttachment.deleteMany({ where: { id, lessonPackageId, lessonPackage: { appId } } })
const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId: Number(userId) } })

const findCustomer = (id, appId) => prisma.cadenzaCustomer.findFirst({ where: { id, appId }, include: { person: true } })
const findCustomerForActor = (actorId, appId, db = prisma) => db.cadenzaCustomer.findFirst({ where: { appId, person: { userId: Number(actorId) } }, include: { person: true } })
const ensureCustomerForActor = async (actorId, appId, db = prisma) => {
  const existing = await findCustomerForActor(actorId, appId, db)
  if (existing) return existing
  const person = await db.person.findUnique({ where: { userId: Number(actorId) }, select: { id: true } })
  if (!person) return null
  try {
    return await db.cadenzaCustomer.create({ data: { appId, personId: person.id }, include: { person: true } })
  } catch (error) {
    if (error?.code !== 'P2002') throw error
    return findCustomerForActor(actorId, appId, db)
  }
}
const findPackage = (id, appId) => prisma.cadenzaLessonPackage.findFirst({ where: { id, appId } })
const createEnrollment = (data, db = prisma) => db.cadenzaEnrollment.create({ data })
const attachPaymentObligation = (id, appId, paymentObligationId, db = prisma) => db.cadenzaEnrollment.update({ where: { id }, data: { paymentObligationId }, include: { lessonPackage: true } })
const listEnrollments = async (appId, db = prisma) => {
  const rows = await db.cadenzaEnrollment.findMany({ where: { appId }, include: { lessonPackage: true, customer: { include: { person: true } }, sessions: { select: { id: true, roomId: true, scheduledStart: true, scheduledEnd: true, status: true, attendance: { select: { status: true } }, instructor: { include: { person: true } } } } }, orderBy: { createdAt: 'desc' } })
  return Promise.all(rows.map(async (row) => ({ ...row, sessions: await hydrateSessions(row.sessions || [], db) })))
}
const findEnrollmentById = async (id, appId, db = prisma) => {
  const row = await db.cadenzaEnrollment.findFirst({ where: { id, appId }, include: { lessonPackage: true, customer: { include: { person: true } }, sessions: { orderBy: { scheduledStart: 'asc' }, include: { attendance: true, instructor: { include: { person: true } } } } } })
  return row ? { ...row, sessions: await hydrateSessions(row.sessions || [], db) } : null
}
const confirmEnrollment = (id, appId, db = prisma) => db.cadenzaEnrollment.updateMany({ where: { id, appId, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED', enrolledAt: new Date(), paymentExpiresAt: null } })
const updateEnrollmentStatus = (id, appId, fromStatuses, status, db = prisma) => db.cadenzaEnrollment.updateMany({ where: { id, appId, status: { in: fromStatuses } }, data: { status } })
const findEnrollment = (id, appId, db = prisma) => db.cadenzaEnrollment.findFirst({ where: { id, appId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }, include: { lessonPackage: true, customer: { include: { person: true } }, _count: { select: { sessions: true } } } })
const findEnrollmentForPackageActor = (lessonPackageId, actorId, appId, db = prisma) => db.cadenzaEnrollment.findFirst({ where: { appId, lessonPackageId, customer: { person: { userId: Number(actorId) } }, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } })
const findInstructor = (id, appId, db = prisma) => db.cadenzaInstructor.findFirst({ where: { id, appId, status: 'ACTIVE' }, include: { person: true } })
const findRoom = (id, appId, db = prisma) => db.cadenzaRoom.findFirst({ where: { id, appId, status: 'AVAILABLE' } })
const listRooms = async (appId, db = prisma) => {\n  const rows = await db.cadenzaRoom.findMany({ where: { appId, status: 'AVAILABLE' }, orderBy: { createdAt: 'asc' } })\n  return Promise.all(rows.map((row) => hydrateSessionRoom({ appId, roomId: row.id }, db).then((session) => ({ ...row, resource: session.resource }))))\n}
const listInstructorAvailability = (instructorId, appId, db = prisma) => db.cadenzaInstructorAvailability.findMany({ where: { instructorId, appId }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] })
const findOverlappingSession = ({ appId, instructorId, roomId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { appId, status: { in: BLOCKING_LESSON_SESSION_STATUSES }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}), OR: [...(instructorId ? [{ instructorId }] : []), ...(roomId ? [{ roomId }] : [])] } })
const findRoomRentalOverlap = ({ appId, roomResourceId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaRental.findFirst({ where: { appId, resourceId: roomResourceId, rentalType: 'ROOM', status: { in: BLOCKING_RENTAL_STATUSES }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) } })
const createSession = (data, db = prisma) => db.cadenzaLessonSession.create({ data })
const findSession = async (id, appId, db = prisma) => hydrateSessionRoom(await db.cadenzaLessonSession.findFirst({ where: { id, appId }, include: { attendance: true, instructor: { include: { person: true } }, enrollment: { include: { customer: { include: { person: true } }, lessonPackage: true } } } }), db)
const upsertAttendance = (sessionId, data, db = prisma) => db.cadenzaAttendance.upsert({
  where: { sessionId },
  create: { sessionId, ...data },
  update: data,
  include: { markedByPerson: true },
})
const createReschedule = (data, db = prisma) => db.cadenzaRescheduleRequest.create({ data })
const findPendingReschedule = (sessionId, appId, db = prisma) => db.cadenzaRescheduleRequest.findFirst({ where: { sessionId, appId, status: 'PENDING' } })
const countReschedulesForSession = (sessionId, appId, db = prisma) => db.cadenzaRescheduleRequest.count({ where: { sessionId, appId, status: { not: 'CANCELLED' } } })
const findReschedule = (id, appId, db = prisma) => db.cadenzaRescheduleRequest.findFirst({
  where: { id, appId },
  include: {
    requestedByPerson: true,
    reviewedByPerson: true,
  },
})
const listReschedules = (appId, db = prisma) => db.cadenzaRescheduleRequest.findMany({
  where: { appId },
  orderBy: { createdAt: 'desc' },
  include: {
    requestedByPerson: true,
    reviewedByPerson: true,
    session: { include: { enrollment: { include: { customer: { include: { person: true } } } } } },
  },
})
const updateReschedule = (id, appId, data, db = prisma) => db.cadenzaRescheduleRequest.updateMany({ where: { id, appId }, data })
const updateSession = (id, appId, data, db = prisma) => db.cadenzaLessonSession.updateMany({ where: { id, appId }, data })
const updateSessionStatusForEnrollment = (enrollmentId, appId, fromStatus, toStatus, db = prisma) => db.cadenzaLessonSession.updateMany({ where: { enrollmentId, appId, status: fromStatus }, data: { status: toStatus } })
const cancelFutureScheduledSessions = (enrollmentId, appId, from, excludeId = null, db = prisma) => db.cadenzaLessonSession.updateMany({ where: { enrollmentId, appId, status: 'SCHEDULED', scheduledStart: { gte: from }, ...(excludeId ? { id: { not: excludeId } } : {}) }, data: { status: 'CANCELLED' } })
const cancelReschedule = (id, appId, db = prisma) => db.cadenzaRescheduleRequest.updateMany({ where: { id, appId, status: 'PENDING' }, data: { status: 'CANCELLED' } })
const listSessionsForInstructorActor = async (appId, userId, db = prisma) => hydrateSessions(await db.cadenzaLessonSession.findMany({ where: { appId, instructor: { person: { userId: Number(userId) } } }, orderBy: { scheduledStart: 'asc' }, include: { attendance: true, enrollment: { include: { customer: { include: { person: true } }, lessonPackage: true } }, instructor: { include: { person: true } } } }), db)
const listSessions = async (appId, db = prisma) => hydrateSessions(await db.cadenzaLessonSession.findMany({ where: { appId }, orderBy: { scheduledStart: 'asc' }, include: { attendance: true, enrollment: { include: { customer: { include: { person: true } }, lessonPackage: true } }, instructor: { include: { person: true } } } }), db)

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

export { listPackages, createPackage, updatePackage, createAttachment, listAttachments, findAttachment, deleteAttachment, findPersonByUserId, findCustomer, findCustomerForActor, ensureCustomerForActor, findPackage, createEnrollment, attachPaymentObligation, listEnrollments, findEnrollmentById, confirmEnrollment, updateEnrollmentStatus, findEnrollment, findEnrollmentForPackageActor, findInstructor, findRoom, listRooms, listInstructorAvailability, findOverlappingSession, findRoomRentalOverlap, createSession, findSession, upsertAttendance, createReschedule, findPendingReschedule, findReschedule, listReschedules, updateReschedule, updateSession, listSessions, listSessionsForInstructorActor, updateSessionStatusForEnrollment, cancelFutureScheduledSessions, cancelReschedule, findExpiredPendingEnrollments, countConsumedSessions, findExpiredSessions }