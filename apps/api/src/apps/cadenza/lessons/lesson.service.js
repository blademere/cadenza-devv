import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import { createPaymentObligation, getObligation, refundPayment } from '../../../platform/payments/payment.service.js'
import { getStorageService } from '../../../platform/storage/storage.registry.js'
import { positiveDecimal, toDecimal } from '../../../platform/money/money.js'
import { createStorageKey } from '../../../platform/storage/storage.key.js'
import * as repository from './lesson.repository.js'
import { assertAvailable as assertInstructorAvailable } from '../instructors/instructor-availability.service.js'
import { enqueueEvent } from '../../../platform/event-bus/event-outbox.service.js'
import * as lifecycle from './lesson-lifecycle.service.js'
import { run as runTransaction } from '../../../platform/transactions/transaction.service.js'
import {
  ENROLLMENT_STATUS,
  LESSON_PACKAGE_STATUS,
  RESCHEDULE_STATUS,
  SESSION_STATUS,
  STUDENT_STATUS,
  ENROLLMENT_PAYMENT_EXPIRATION_HOURS,
  ENROLLMENT_CANCELLATION_CUTOFF_HOURS,
  RESCHEDULE_CUTOFF_HOURS,
  MAX_RESCHEDULE_REQUESTS_PER_SESSION,
  ENROLLMENT_EVENTS,
} from '../cadenza.constants.js'
const canManage = async (userId, appId) =>
  can({
    userId: Number(userId),
    appId,
    resource: 'cadenza_lessons',
    action: 'manage',
  })
const assertInstructorOrManager = async ({ session, actorId, appId }) => {
  if (await canManage(actorId, appId)) return
  if (Number(session.instructor?.person?.userId) === Number(actorId)) return
  throw new ForbiddenError('Only the assigned instructor or lesson management staff can act on attendance.')
}
const assertSessionActor = async ({
  session,
  actorId,
  appId,
  allowStudent = true,
}) => {
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  if (await canManage(actorId, appId)) return
  if (
    allowStudent &&
    Number(session.enrollment?.student?.person?.userId) === Number(actorId)
  )
    return
  if (Number(session.instructor?.person?.userId) === Number(actorId)) return
  throw new ForbiddenError(
    'You can only act on lesson sessions you are authorized to manage.'
  )
}
const decimalAmount = (value, field = 'amount') => {
  try {
    return positiveDecimal(value, field)
  } catch {
    throw new BadRequestError(field + ' must be greater than zero.')
  }
}
const listPackages = ({ appId }) => repository.listPackages(requireAppId(appId))
const createPackage = async ({
  appId,
  name,
  description,
  price,
  numberOfSessions,
}) => {
  const owner = requireAppId(appId)
  const amount = decimalAmount(price, 'price')
  if (!name?.trim()) throw new BadRequestError('name is required.')
  if (
    !Number.isInteger(Number(numberOfSessions)) ||
    Number(numberOfSessions) <= 0
  )
    throw new BadRequestError('numberOfSessions must be greater than zero.')
  try {
    return await repository.createPackage({
      appId: owner,
      name: name.trim(),
      description: description?.trim() || null,
      price: amount,
      numberOfSessions: Number(numberOfSessions),
    })
  } catch (e) {
    if (e?.code === 'P2002')
      throw new ConflictError(
        'Lesson package name is already used in this application.'
      )
    throw e
  }
}
const updatePackage = async ({ appId, id, ...data }) => { const owner=requireAppId(appId); const current=await repository.findPackage(id,owner); if(!current) throw new NotFoundError('Lesson package not found.'); if(data.price!==undefined) data.price=decimalAmount(data.price,'price'); if(data.numberOfSessions!==undefined && (!Number.isInteger(Number(data.numberOfSessions))||Number(data.numberOfSessions)<=0)) throw new BadRequestError('numberOfSessions must be greater than zero.'); if(data.name!==undefined && !data.name?.trim()) throw new BadRequestError('name is required.'); if(data.name!==undefined) data.name=data.name.trim(); if(data.description!==undefined) data.description=data.description?.trim()||null; const result=await repository.updatePackage(id,owner,data); if(result.count!==1) throw new ConflictError('Lesson package was modified or no longer exists.'); return repository.findPackage(id,owner) }
const addAttachment = async ({
  appId,
  actorId,
  lessonPackageId,
  fileName,
  contentBase64,
  contentType,
  type,
  metadata,
}) => {
  const owner = requireAppId(appId)
  if (!(await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'manage' })))
    throw new ForbiddenError('Only lesson management staff can add attachments.')
  if (!(await repository.findPackage(lessonPackageId, owner)))
    throw new NotFoundError('Lesson package not found.')
  if (
    typeof contentBase64 !== 'string' ||
    !contentBase64 ||
    contentBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) ||
    (contentBase64.endsWith('=') && contentBase64.slice(0, -2).includes('='))
  )
    throw new BadRequestError('contentBase64 must be valid base64.')
  let body
  try {
    body = Buffer.from(contentBase64, 'base64')
  } catch {
    throw new BadRequestError('contentBase64 must be valid base64.')
  }
  if (!body.length || body.toString('base64') !== contentBase64)
    throw new BadRequestError('contentBase64 must be valid base64.')
  if (body.length > 950 * 1024)
    throw new BadRequestError('Attachment content must be 950 KB or smaller.')
  const storageKey = createStorageKey(
    fileName,
    `cadenza/${owner}/lesson-attachments`
  )
  const storage = getStorageService()
  await storage.put({
    key: storageKey,
    body,
    contentType,
    metadata: { application: 'cadenza', lessonPackageId },
  })
  try {
    return await repository.createAttachment({
      lessonPackageId,
      storageReference: storageKey,
      type: type.trim(),
      metadata: {
        ...(metadata ?? {}),
        contentType,
        fileName,
        size: body.length,
      },
    })
  } catch (error) {
    await storage.delete({ key: storageKey }).catch(() => {})
    throw error
  }
}
const getAttachmentUrl = async ({ appId, lessonPackageId, id, actorId }) => {
  const owner = requireAppId(appId)
  if (!(await canManage(actorId, owner)) && !(await repository.findEnrollmentForPackageActor(lessonPackageId, actorId, owner)))
    throw new NotFoundError('Lesson attachment not found.')
  const attachment = await repository.findAttachment(id, lessonPackageId, owner)
  if (!attachment) throw new NotFoundError('Lesson attachment not found.')
  const url = await getStorageService().getSignedUrl({ key: attachment.storageReference })
  return { id: attachment.id, type: attachment.type, metadata: attachment.metadata, url }
}
const listAttachments = async ({ appId, lessonPackageId, actorId }) => {
  const owner = requireAppId(appId)
  if (!(await repository.findPackage(lessonPackageId, owner)))
    throw new NotFoundError('Lesson package not found.')
  if (!(await canManage(actorId, owner)) && !(await repository.findEnrollmentForPackageActor(lessonPackageId, actorId, owner)))
    throw new NotFoundError('Lesson package not found.')
  return repository.listAttachments(lessonPackageId, owner)
}
const removeAttachment = async ({ appId, actorId, lessonPackageId, id }) => {
  const owner = requireAppId(appId)
  if (!(await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'manage' })))
    throw new ForbiddenError('Only lesson management staff can remove attachments.')
  const attachment = await repository.findAttachment(id, lessonPackageId, owner)
  if (!attachment) throw new NotFoundError('Lesson attachment not found.')
  const result = await repository.deleteAttachment(id, lessonPackageId, owner)
  if (result.count !== 1)
    throw new ConflictError(
      'Lesson attachment was modified or no longer exists.'
    )
  await getStorageService()
    .delete({ key: attachment.storageReference })
    .catch(() => {})
  return { id }
}
const getEnrollment = async ({ appId, id, actorId }) => {
  const owner = requireAppId(appId)
  const enrollment = await repository.findEnrollmentById(id, owner)
  if (!enrollment) throw new NotFoundError('Enrollment not found.')
  const manager = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_enrollments', action: 'manage' })
  if (!manager && Number(enrollment.student?.person?.userId) !== Number(actorId))
    throw new NotFoundError('Enrollment not found.')
  const sessions = enrollment.sessions || []
  const completedSessions = sessions.filter((session) => session.status === SESSION_STATUS.COMPLETED).length
  const scheduledSessions = sessions.filter((session) => session.status === SESSION_STATUS.SCHEDULED).length
  const attendedSessions = sessions.filter((session) => ['PRESENT', 'LATE', 'EXCUSED'].includes(session.attendance?.status)).length
  const totalSessions = Number(enrollment.lessonPackage?.numberOfSessions || 0)
  return {
    ...enrollment,
    progress: {
      totalSessions,
      scheduledSessions,
      completedSessions,
      attendedSessions,
      remainingSessions: Math.max(totalSessions - completedSessions, 0),
      completionPercent: totalSessions ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0,
    },
  }
}
const listEnrollments = async ({ appId, actorId }) => {
  const owner = requireAppId(appId)
  const rows = await repository.listEnrollments(owner)
  const scoped = (await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_enrollments', action: 'manage' }))
    ? rows
    : rows.filter((row) => Number(row.student?.person?.userId) === Number(actorId))
  return scoped.map((row) => {
    const completedSessions = (row.sessions || []).filter((session) => session.status === SESSION_STATUS.COMPLETED).length
    const totalSessions = Number(row.lessonPackage?.numberOfSessions || 0)
    return {
      ...row,
      progress: {
        totalSessions,
        completedSessions,
        remainingSessions: Math.max(totalSessions - completedSessions, 0),
        completionPercent: totalSessions ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0,
      },
    }
  })
}
const cancelEnrollment = async ({ appId, id, actorId }) => {
  const owner = requireAppId(appId)
  return runTransaction(async (tx) => {
    const enrollment = await repository.findEnrollmentById(id, owner, tx)
    if (!enrollment) throw new NotFoundError('Enrollment not found.')
    if ([ENROLLMENT_STATUS.CANCELLED, ENROLLMENT_STATUS.COMPLETED].includes(enrollment.status))
      throw new ConflictError('Enrollment cannot be cancelled from its current state.')

    const manager = await can({
      userId: Number(actorId),
      appId: owner,
      resource: 'cadenza_enrollments',
      action: 'manage',
    })
    const student = Number(enrollment.student?.person?.userId) === Number(actorId)
    if (!manager && !student)
      throw new ForbiddenError('You can only cancel your own enrollment.')
    if (!manager) {
      const now = Date.now()
      if (enrollment.sessions.some((session) => session.status === SESSION_STATUS.COMPLETED || session.status === SESSION_STATUS.MISSED))
        throw new ConflictError('Student cancellation is not available after a lesson session has been consumed.')
      if (enrollment.sessions.some((session) => session.status === SESSION_STATUS.SCHEDULED && session.scheduledStart.getTime() - now < ENROLLMENT_CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000))
        throw new ConflictError('Student cancellation must be requested at least 24 hours before the next scheduled lesson.')
    }

    if (enrollment.paymentObligationId) {
      const obligation = await getObligation(enrollment.paymentObligationId, owner, tx)
      const payments =
        obligation?.payments?.filter((payment) => payment.status === 'SUCCEEDED') || []
      if (payments.length && !manager)
        throw new ForbiddenError(
          'Paid enrollment cancellation requires lesson management staff.'
        )

      for (const payment of payments) {
        const refunded = (payment.refunds || [])
          .filter((item) => item.status === 'SUCCEEDED')
          .reduce((sum, item) => sum.plus(item.amount), toDecimal('0'))
        const refundable = toDecimal(String(payment.amount)).minus(refunded)
        if (refundable.gt(0)) {
          await refundPayment({
            appId: owner,
            paymentId: payment.id,
            amount: String(refundable),
            currency: payment.currency,
            reason: 'Lesson enrollment cancellation',
            actorId,
            manual: true,
            idempotencyKey: `cadenza:enrollment-cancel-refund:${id}:${payment.id}`,
            db: tx,
          })
        }
      }
    }

    await repository.updateSessionStatusForEnrollment?.(id, owner, SESSION_STATUS.SCHEDULED, SESSION_STATUS.CANCELLED, tx)
    const result = await repository.updateEnrollmentStatus(
      id,
      owner,
      [
        ENROLLMENT_STATUS.PENDING_PAYMENT,
        ENROLLMENT_STATUS.CONFIRMED,
        ENROLLMENT_STATUS.IN_PROGRESS,
      ],
      ENROLLMENT_STATUS.CANCELLED,
      tx
    )
    if (result.count !== 1) throw new ConflictError('Enrollment is no longer cancellable.')
    const cancelled = await repository.findEnrollmentById(id, owner, tx)
    await enqueueEvent({ db: tx, event: ENROLLMENT_EVENTS.CANCELLED, entityType: 'CadenzaEnrollment', entityId: id, actorId, context: { appId: owner }, idempotencyKey: `cadenza:${ENROLLMENT_EVENTS.CANCELLED}:${id}` })
    return cancelled
  })
}

const enroll = async ({
  appId,
  studentId,
  lessonPackageId,
  currency = 'PHP',
  actorId,
}) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  const isManager = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_enrollments', action: 'manage' })
  const resolvedStudentId = isManager ? studentId : (await repository.findStudentForActor(actorId, owner))?.id
  if (!resolvedStudentId) throw new NotFoundError('Student not found.')
  const student = await repository.findStudent(resolvedStudentId, owner)
  if (!student) throw new NotFoundError('Student not found.')
  if (!isManager && Number(student.person?.userId) !== Number(actorId))
    throw new ForbiddenError('You can only enroll yourself as a Cadenza student.')
  if (student.status !== STUDENT_STATUS.ACTIVE)
    throw new ConflictError('Student is not active.')
  const pkg = await repository.findPackage(lessonPackageId, owner)
  if (!pkg) throw new NotFoundError('Lesson package not found.')
  if (pkg.status !== LESSON_PACKAGE_STATUS.ACTIVE)
    throw new ConflictError('Lesson package is not active.')
  try {
    return await runTransaction(async (tx) => {
      const enrollment = await repository.createEnrollment(
        {
          appId: owner,
          studentId: resolvedStudentId,
          lessonPackageId,
          status: ENROLLMENT_STATUS.PENDING_PAYMENT,
          paymentExpiresAt: new Date(Date.now() + ENROLLMENT_PAYMENT_EXPIRATION_HOURS * 60 * 60 * 1000),
        },
        tx
      )
      const obligation = await createPaymentObligation({
        appId: owner,
        referenceType: 'CADENZA_ENROLLMENT',
        referenceId: enrollment.id,
        totalAmount: pkg.price,
        currency,
        db: tx,
        metadata: { requirement: 'FULL_PAYMENT' },
      })
      return repository.attachPaymentObligation(
        enrollment.id,
        owner,
        obligation.id,
        tx
      )
    })
  } catch (e) {
    if (e?.code === 'P2002')
      throw new ConflictError(
        'Student is already enrolled in this lesson package.'
      )
    throw e
  }
}
const listSessions = async ({ appId, actorId }) => {
  const owner = requireAppId(appId)
  const rows = await repository.listSessions(owner)
  if (await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'manage' })) return rows
  return rows.filter((row) => Number(row.enrollment?.student?.person?.userId) === Number(actorId) || Number(row.instructor?.person?.userId) === Number(actorId))
}
const getSession = async ({ appId, id }) => {
  const value = await repository.findSession(id, requireAppId(appId))
  if (!value) throw new NotFoundError('Lesson session not found.')
  return value
}
const listReschedules = async ({ appId, actorId }) => {
  const owner = requireAppId(appId)
  const rows = await repository.listReschedules(owner)
  if (await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'manage' })) return rows
  return rows.filter((row) => Number(row.session?.enrollment?.student?.person?.userId) === Number(actorId) || Number(row.requestedByUserId) === Number(actorId))
}
const getReschedule = async ({ appId, id }) => {
  const value = await repository.findReschedule(id, requireAppId(appId))
  if (!value) throw new NotFoundError('Reschedule request not found.')
  return value
}
const createSession = async ({
  appId,
  actorId,
  enrollmentId,
  instructorId,
  roomId,
  scheduledStart,
  scheduledEnd,
}) => {
  const owner = requireAppId(appId)
  if (!(await canManage(actorId, owner))) throw new ForbiddenError('Only lesson management staff can schedule sessions.')
  const start = new Date(scheduledStart),
    end = new Date(scheduledEnd)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  )
    throw new BadRequestError('scheduledEnd must be after scheduledStart.')
  return runTransaction(async (tx) => {
    const enrollment = await repository.findEnrollment(enrollmentId, owner, tx)
    if (!enrollment) throw new NotFoundError('Confirmed enrollment not found.')
    const sessionCount = await repository.countConsumedSessions(enrollmentId, owner, tx)
    const maxSessions = Number(enrollment.lessonPackage?.numberOfSessions)
    if (Number.isFinite(maxSessions) && sessionCount >= maxSessions)
      throw new ConflictError(
        'Lesson package session limit has been reached for this enrollment.'
      )
    if (
      instructorId &&
      !(await repository.findInstructor(instructorId, owner, tx))
    )
      throw new NotFoundError('Instructor not found.')
    if (instructorId) {
      const instructor = await repository.findInstructor(instructorId, owner, tx)
      if (!instructor?.person?.userId) throw new NotFoundError('Instructor not found.')
    }
    if (instructorId) {
      await assertInstructorAvailable({ appId: owner, instructorId, startsAt: start, endsAt: end, db: tx })
    }
    if (roomId && !(await repository.findRoom(roomId, owner, tx)))
      throw new NotFoundError('Room not found.')
    if (
      await repository.findOverlappingSession(
        { appId: owner, instructorId, roomId, startsAt: start, endsAt: end },
        tx
      )
    )
      throw new ConflictError(
        'Instructor or room is already scheduled for an overlapping lesson session.'
      )
    if (roomId) {
      const room = await repository.findRoom(roomId, owner, tx)
      if (!room) throw new NotFoundError('Room not found.')
      if (await repository.findRoomRentalOverlap({
        appId: owner,
        roomResourceId: room.resourceId,
        startsAt: start,
        endsAt: end,
      }, tx))
        throw new ConflictError('Room is already reserved for an overlapping booking.')
    }
    const created = await repository.createSession(
      {
        appId: owner,
        enrollmentId,
        instructorId: instructorId || null,
        roomId: roomId || null,
        scheduledStart: start,
        scheduledEnd: end,
        status: SESSION_STATUS.SCHEDULED,
      },
      tx
    )
    await lifecycle.ensureInProgress({ appId: owner, enrollmentId, actorId, db: tx })
    return created
  })
}
const markAttendance = async ({ appId, sessionId, actorId, status, notes }) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  return runTransaction(async (tx) => {
    const session = await repository.findSession(sessionId, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    await assertInstructorOrManager({ session, actorId, appId: owner })
    if (
      [SESSION_STATUS.CANCELLED, SESSION_STATUS.COMPLETED].includes(
        session.status
      )
    )
      throw new ConflictError(
        'Attendance cannot be changed for a cancelled or completed session.'
      )
    const attendance = await repository.upsertAttendance(
      sessionId,
      { status, markedByUserId: Number(actorId), notes: notes?.trim() || null },
      tx
    )
    await lifecycle.ensureInProgress({ appId: owner, enrollmentId: session.enrollment.id, actorId, db: tx })
    if (status === ATTENDANCE_STATUS.ABSENT) {
      await repository.updateSession(sessionId, owner, { status: SESSION_STATUS.MISSED }, tx)
      await lifecycle.advanceAfterSession({ appId: owner, enrollmentId: session.enrollment.id, sessionId, outcome: SESSION_STATUS.MISSED, actorId, db: tx })
    }
    return attendance
  })
}
const requestReschedule = async ({
  appId,
  sessionId,
  actorId,
  requestedStart,
  requestedEnd,
  reason,
}) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  const start = new Date(requestedStart),
    end = new Date(requestedEnd)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    !(start < end)
  )
    throw new BadRequestError('requestedEnd must be after requestedStart.')
  return runTransaction(async (tx) => {
    const session = await repository.findSession(sessionId, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    const manager = await canManage(actorId, owner)
    const student = Number(session.enrollment?.student?.person?.userId) === Number(actorId)
    if (!manager && !student) throw new ForbiddenError('Only the enrolled student can request a reschedule.')
    if (
      [SESSION_STATUS.CANCELLED, SESSION_STATUS.COMPLETED].includes(
        session.status
      )
    )
      throw new ConflictError('Only active lesson sessions can be rescheduled.')
    if (session.scheduledStart.getTime() - Date.now() < RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000 || start.getTime() - Date.now() < RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000)
      throw new ConflictError('Lesson reschedule requests must be made at least 24 hours before the affected lesson time.')
    if (!reason?.trim()) throw new BadRequestError('reason is required for a reschedule request.')
    if (await repository.findPendingReschedule(sessionId, owner, tx))
      throw new ConflictError('A pending reschedule request already exists for this lesson session.')
    if (await repository.countReschedulesForSession(sessionId, owner, tx) >= MAX_RESCHEDULE_REQUESTS_PER_SESSION)
      throw new ConflictError('The maximum number of reschedule requests for this lesson session has been reached.')
    const created = await repository.createReschedule(
      {
        appId: owner,
        sessionId,
        requestedByUserId: Number(actorId),
        requestedStart: start,
        requestedEnd: end,
        reason: reason?.trim() || null,
        status: RESCHEDULE_STATUS.PENDING,
      },
      tx
    )
  })
}
const cancelReschedule = async ({ appId, id, actorId }) => {
  const owner = requireAppId(appId)
  const request = await repository.findReschedule(id, owner)
  if (!request || request.status !== RESCHEDULE_STATUS.PENDING) throw new NotFoundError('Pending reschedule request not found.')
  const session = await repository.findSession(request.sessionId, owner)
  const manager = await canManage(actorId, owner)
  if (!manager && Number(request.requestedByUserId) !== Number(actorId)) throw new ForbiddenError('You can only cancel your own reschedule request.')
  if (!session) throw new NotFoundError('Lesson session not found.')
  return runTransaction(async (tx) => {
    const result = await repository.cancelReschedule(id, owner, tx)
    if (result.count !== 1) throw new ConflictError('Reschedule request is no longer pending.')
    await enqueueEvent({ db: tx, event: ENROLLMENT_EVENTS.RESCHEDULE_CANCELLED, entityType: 'CadenzaRescheduleRequest', entityId: id, actorId, context: { appId: owner, sessionId: request.sessionId }, idempotencyKey: `cadenza:${ENROLLMENT_EVENTS.RESCHEDULE_CANCELLED}:${id}` })
    return repository.findReschedule(id, owner, tx)
  })
}
const reviewReschedule = async ({ appId, id, actorId, approve }) => {
  const owner = requireAppId(appId)
  if (!(await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'review_reschedule' })))
    throw new ForbiddenError('Only lesson management staff can review reschedule requests.')
  return runTransaction(async (tx) => {
    const initialRequest = await repository.findReschedule(id, owner, tx)
    if (!initialRequest)
      throw new NotFoundError('Reschedule request not found.')
    if (initialRequest.status !== 'PENDING')
      throw new ConflictError(
        'Only pending reschedule requests can be reviewed.'
      )
    const initialSession = await repository.findSession(
      initialRequest.sessionId,
      owner,
      tx
    )
    if (!initialSession) throw new NotFoundError('Lesson session not found.')
    const request = await repository.findReschedule(id, owner, tx)
    if (!request) throw new NotFoundError('Reschedule request not found.')
    if (request.status !== RESCHEDULE_STATUS.PENDING)
      throw new ConflictError(
        'Only pending reschedule requests can be reviewed.'
      )
    const session = await repository.findSession(request.sessionId, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    if (
      [SESSION_STATUS.CANCELLED, SESSION_STATUS.COMPLETED].includes(
        session.status
      )
    )
      throw new ConflictError('Only active lesson sessions can be rescheduled.')
    if (!approve) {
      await repository.updateReschedule(id, owner, { status: RESCHEDULE_STATUS.REJECTED, reviewedByUserId: Number(actorId), reviewedAt: new Date() }, tx)
      await enqueueEvent({ db: tx, event: ENROLLMENT_EVENTS.RESCHEDULE_REJECTED, entityType: 'CadenzaRescheduleRequest', entityId: id, actorId, context: { appId: owner, sessionId: session.id, enrollmentId: session.enrollmentId }, idempotencyKey: `cadenza:${ENROLLMENT_EVENTS.RESCHEDULE_REJECTED}:${id}` })
      return repository.findReschedule(id, owner, tx)
    }
    if (
      await repository.findOverlappingSession(
        {
          appId: owner,
          instructorId: session.instructorId,
          roomId: session.roomId,
          startsAt: request.requestedStart,
          endsAt: request.requestedEnd,
          excludeId: session.id,
        },
        tx
      )
    )
      throw new ConflictError(
        'Instructor or room is already scheduled for an overlapping lesson session.'
      )
    if (session.roomId) {
      const room = await repository.findRoom(session.roomId, owner, tx)
      if (room && await repository.findRoomRentalOverlap({
        appId: owner,
        roomResourceId: room.resourceId,
        startsAt: request.requestedStart,
        endsAt: request.requestedEnd,
        excludeId: undefined,
      }, tx))
        throw new ConflictError('Room is already reserved for an overlapping rental.')
    }
    await repository.updateSession(
      session.id,
      owner,
      {
        scheduledStart: request.requestedStart,
        scheduledEnd: request.requestedEnd,
      },
      tx
    )
    await repository.updateReschedule(
      id,
      owner,
      {
        status: RESCHEDULE_STATUS.APPROVED,
        reviewedByUserId: Number(actorId),
        reviewedAt: new Date(),
      },
      tx
    )
    await enqueueEvent({ db: tx, event: ENROLLMENT_EVENTS.RESCHEDULE_APPROVED, entityType: 'CadenzaRescheduleRequest', entityId: id, actorId, context: { appId: owner, sessionId: session.id, enrollmentId: session.enrollmentId }, idempotencyKey: `cadenza:${ENROLLMENT_EVENTS.RESCHEDULE_APPROVED}:${id}` })
    return repository.findReschedule(id, owner, tx)
  })
}
const transitionSession = async ({ appId, id, status, expectedStatus }) => {
  const owner = requireAppId(appId)
  return runTransaction(async (tx) => {
    const session = await repository.findSession(id, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    if (session.status !== expectedStatus)
      throw new ConflictError('Lesson session is not in the expected state.')
    const result = await repository.updateSession(id, owner, { status }, tx)
    if (result.count !== 1)
      throw new ConflictError(
        'Lesson session was modified or no longer exists.'
      )
    return repository.findSession(id, owner, tx)
  })
}
const completeSession = async ({ appId, id, actorId }) => {
  const owner = requireAppId(appId)
  if (!(await canManage(actorId, owner)))
    throw new ForbiddenError('Only lesson management staff can complete sessions.')
  return runTransaction(async (tx) => {
    const session = await repository.findSession(id, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    if (session.status !== SESSION_STATUS.SCHEDULED)
      throw new ConflictError('Lesson session is not in the expected state.')
    await repository.updateSession(id, owner, { status: SESSION_STATUS.COMPLETED }, tx)
    await lifecycle.advanceAfterSession({ appId: owner, enrollmentId: session.enrollmentId, sessionId: id, outcome: SESSION_STATUS.COMPLETED, actorId, db: tx })
    return repository.findSession(id, owner, tx)
  })
}
const cancelSession = async ({ appId, id, actorId }) => {
  if (!(await canManage(actorId, requireAppId(appId))))
    throw new ForbiddenError('Only lesson management staff can cancel sessions.')
  return transitionSession({ appId, id, status: SESSION_STATUS.CANCELLED, expectedStatus: SESSION_STATUS.SCHEDULED })
}
export {
  listPackages,
  createPackage,
  updatePackage,
  addAttachment,
  listAttachments,
  getAttachmentUrl,
  removeAttachment,
  listEnrollments,
  getEnrollment,
  enroll,
  cancelEnrollment,
  listSessions,
  getSession,
  getReschedule,
  listReschedules,
  createSession,
  markAttendance,
  requestReschedule,
  reviewReschedule,
  cancelReschedule,
  completeSession,
  cancelSession,
}
