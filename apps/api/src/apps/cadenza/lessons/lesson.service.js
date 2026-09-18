import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import { createPaymentObligation } from '../../../platform/payments/payment.service.js'
import { getStorageService } from '../../../platform/storage/storage.registry.js'
import { createStorageKey } from '../../../platform/storage/storage.key.js'
import * as repository from './lesson.repository.js'
import {
  ENROLLMENT_STATUS,
  LESSON_PACKAGE_STATUS,
  RESCHEDULE_STATUS,
  SESSION_STATUS,
  STUDENT_STATUS,
} from '../cadenza.constants.js'
const canManage = async (userId, appId) =>
  can({
    userId: Number(userId),
    appId,
    resource: 'cadenza_lessons',
    action: 'manage',
  })
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
  throw new ForbiddenError(
    'You can only act on lesson sessions you are authorized to manage.'
  )
}
const decimalAmount = (value) => {
  try {
    const amount = new Prisma.Decimal(value)
    if (!amount.isFinite() || amount.lte(0)) throw new Error()
    return amount
  } catch {
    throw new BadRequestError('price must be greater than zero.')
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
const addAttachment = async ({
  appId,
  lessonPackageId,
  fileName,
  contentBase64,
  contentType,
  type,
  metadata,
}) => {
  const owner = requireAppId(appId)
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
const listAttachments = async ({ appId, lessonPackageId }) => {
  const owner = requireAppId(appId)
  if (!(await repository.findPackage(lessonPackageId, owner)))
    throw new NotFoundError('Lesson package not found.')
  return repository.listAttachments(lessonPackageId, owner)
}
const removeAttachment = async ({ appId, lessonPackageId, id }) => {
  const owner = requireAppId(appId)
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
const listEnrollments = ({ appId }) =>
  repository.listEnrollments(requireAppId(appId))
const enroll = async ({
  appId,
  studentId,
  lessonPackageId,
  currency = 'PHP',
}) => {
  const owner = requireAppId(appId)
  const student = await repository.findStudent(studentId, owner)
  if (!student) throw new NotFoundError('Student not found.')
  if (student.status !== STUDENT_STATUS.ACTIVE)
    throw new ConflictError('Student is not active.')
  const pkg = await repository.findPackage(lessonPackageId, owner)
  if (!pkg) throw new NotFoundError('Lesson package not found.')
  if (pkg.status !== LESSON_PACKAGE_STATUS.ACTIVE)
    throw new ConflictError('Lesson package is not active.')
  try {
    return await repository.withTransaction(async (tx) => {
      const enrollment = await repository.createEnrollment(
        {
          appId: owner,
          studentId,
          lessonPackageId,
          status: ENROLLMENT_STATUS.PENDING_PAYMENT,
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
const listSessions = ({ appId }) => repository.listSessions(requireAppId(appId))
const createSession = async ({
  appId,
  enrollmentId,
  instructorId,
  roomId,
  scheduledStart,
  scheduledEnd,
}) => {
  const owner = requireAppId(appId)
  const start = new Date(scheduledStart),
    end = new Date(scheduledEnd)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  )
    throw new BadRequestError('scheduledEnd must be after scheduledStart.')
  return repository.withTransaction(async (tx) => {
    await repository.lockEnrollment(enrollmentId, owner, tx)
    if (instructorId) await repository.lockInstructor(instructorId, owner, tx)
    if (roomId) await repository.lockRoom(roomId, owner, tx)
    const enrollment = await repository.findEnrollment(enrollmentId, owner, tx)
    if (!enrollment) throw new NotFoundError('Confirmed enrollment not found.')
    const sessionCount = enrollment._count?.sessions ?? 0
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
    return repository.createSession(
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
  })
}
const markAttendance = async ({ appId, sessionId, actorId, status, notes }) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  return repository.withTransaction(async (tx) => {
    const session = await repository.findSession(sessionId, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    await assertSessionActor({ session, actorId, appId: owner })
    if (
      [SESSION_STATUS.CANCELLED, SESSION_STATUS.COMPLETED].includes(
        session.status
      )
    )
      throw new ConflictError(
        'Attendance cannot be changed for a cancelled or completed session.'
      )
    return repository.upsertAttendance(
      sessionId,
      { status, markedByUserId: Number(actorId), notes: notes?.trim() || null },
      tx
    )
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
  return repository.withTransaction(async (tx) => {
    const session = await repository.findSession(sessionId, owner, tx)
    if (!session) throw new NotFoundError('Lesson session not found.')
    await assertSessionActor({ session, actorId, appId: owner })
    if (
      [SESSION_STATUS.CANCELLED, SESSION_STATUS.COMPLETED].includes(
        session.status
      )
    )
      throw new ConflictError('Only active lesson sessions can be rescheduled.')
    return repository.createReschedule(
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
const reviewReschedule = async ({ appId, id, actorId, approve }) => {
  const owner = requireAppId(appId)
  if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0)
    throw new BadRequestError('Authenticated actor is required.')
  return repository.withTransaction(async (tx) => {
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
    if (initialSession.instructorId)
      await repository.lockInstructor(initialSession.instructorId, owner, tx)
    if (initialSession.roomId)
      await repository.lockRoom(initialSession.roomId, owner, tx)
    await repository.lockSession(initialSession.id, owner, tx)
    await repository.lockReschedule(id, owner, tx)
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
      await repository.updateReschedule(
        id,
        owner,
        {
          status: RESCHEDULE_STATUS.REJECTED,
          reviewedByUserId: Number(actorId),
          reviewedAt: new Date(),
        },
        tx
      )
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
    return repository.findReschedule(id, owner, tx)
  })
}
const transitionSession = async ({ appId, id, status, expectedStatus }) => {
  const owner = requireAppId(appId)
  return repository.withTransaction(async (tx) => {
    await repository.lockSession(id, owner, tx)
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
const completeSession = ({ appId, id }) =>
  transitionSession({
    appId,
    id,
    status: SESSION_STATUS.COMPLETED,
    expectedStatus: SESSION_STATUS.SCHEDULED,
  })
const cancelSession = ({ appId, id }) =>
  transitionSession({
    appId,
    id,
    status: SESSION_STATUS.CANCELLED,
    expectedStatus: SESSION_STATUS.SCHEDULED,
  })
export {
  listPackages,
  createPackage,
  addAttachment,
  listAttachments,
  removeAttachment,
  listEnrollments,
  enroll,
  listSessions,
  createSession,
  markAttendance,
  requestReschedule,
  reviewReschedule,
  completeSession,
  cancelSession,
}
