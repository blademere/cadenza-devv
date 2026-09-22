import { enqueueEvent } from '../../../platform/event-bus/event-outbox.service.js'
import { run as runTransaction } from '../../../platform/transactions/transaction.service.js'
import * as repository from './lesson.repository.js'
import {
  ENROLLMENT_EVENTS,
  ENROLLMENT_STATUS,
  SESSION_STATUS,
} from '../cadenza.constants.js'

const emit = async ({ db, event, enrollment, sessionId = null, actorId = null, context = {} }) =>
  enqueueEvent({
    db,
    event,
    entityType: sessionId ? 'CadenzaLessonSession' : 'CadenzaEnrollment',
    entityId: sessionId || enrollment.id,
    actorId,
    context: {
      appId: enrollment.appId,
      enrollmentId: enrollment.id,
      ...(sessionId ? { sessionId } : {}),
      ...context,
    },
    idempotencyKey: `cadenza:${event}:${enrollment.id}:${sessionId || enrollment.status}`,
  })

const confirmEnrollment = async ({ appId, enrollmentId, actorId = null, db }) => {
  const execute = async (tx) => {
    const enrollment = await repository.findEnrollmentById(enrollmentId, appId, tx)
    if (!enrollment) return null
    if (enrollment.status !== ENROLLMENT_STATUS.PENDING_PAYMENT) return enrollment

    const result = await repository.confirmEnrollment(enrollmentId, appId, tx)
    if (result.count !== 1) return repository.findEnrollmentById(enrollmentId, appId, tx)

    const confirmed = await repository.findEnrollmentById(enrollmentId, appId, tx)
    await emit({
      db: tx,
      event: ENROLLMENT_EVENTS.CONFIRMED,
      enrollment: confirmed,
      actorId,
    })
    return confirmed
  }
  return db ? execute(db) : runTransaction(execute)
}

const ensureInProgress = async ({ appId, enrollmentId, actorId = null, db }) => {
  const enrollment = await repository.findEnrollmentById(enrollmentId, appId, db)
  if (!enrollment || enrollment.status !== ENROLLMENT_STATUS.CONFIRMED) return enrollment

  const result = await repository.updateEnrollmentStatus(
    enrollmentId,
    appId,
    [ENROLLMENT_STATUS.CONFIRMED],
    ENROLLMENT_STATUS.IN_PROGRESS,
    db,
  )
  if (result.count !== 1) return repository.findEnrollmentById(enrollmentId, appId, db)

  const updated = await repository.findEnrollmentById(enrollmentId, appId, db)
  await emit({
    db,
    event: ENROLLMENT_EVENTS.IN_PROGRESS,
    enrollment: updated,
    actorId,
  })
  return updated
}

const advanceAfterSession = async ({
  appId,
  enrollmentId,
  sessionId,
  outcome,
  actorId = null,
  db,
}) => {
  const enrollment = await repository.findEnrollmentById(enrollmentId, appId, db)
  if (!enrollment) return null

  const totalSessions = Number(enrollment.lessonPackage?.numberOfSessions || 0)
  const consumedSessions = await repository.countConsumedSessions(enrollmentId, appId, db)
  const event = outcome === SESSION_STATUS.MISSED
    ? ENROLLMENT_EVENTS.SESSION_MISSED
    : ENROLLMENT_EVENTS.SESSION_COMPLETED

  await emit({
    db,
    event,
    enrollment,
    sessionId,
    actorId,
    context: { outcome, consumedSessions, totalSessions },
  })

  if (consumedSessions >= totalSessions && totalSessions > 0) {
    const result = await repository.updateEnrollmentStatus(
      enrollmentId,
      appId,
      [ENROLLMENT_STATUS.CONFIRMED, ENROLLMENT_STATUS.IN_PROGRESS],
      ENROLLMENT_STATUS.COMPLETED,
      db,
    )
    if (result.count === 1) {
      const completed = await repository.findEnrollmentById(enrollmentId, appId, db)
      await emit({
        db,
        event: ENROLLMENT_EVENTS.COMPLETED,
        enrollment: completed,
        actorId,
        context: { consumedSessions, totalSessions },
      })
      return completed
    }
  }

  if (enrollment.status === ENROLLMENT_STATUS.CONFIRMED) {
    return ensureInProgress({ appId, enrollmentId, actorId, db })
  }

  return repository.findEnrollmentById(enrollmentId, appId, db)
}

const expirePendingEnrollments = async ({ now = new Date() } = {}) => {
  const expired = await repository.findExpiredPendingEnrollments(now)
  let count = 0

  for (const candidate of expired) {
    await runTransaction(async (tx) => {
      const enrollment = await repository.findEnrollmentById(candidate.id, candidate.appId, tx)
      if (
        !enrollment ||
        enrollment.status !== ENROLLMENT_STATUS.PENDING_PAYMENT ||
        !enrollment.paymentExpiresAt ||
        enrollment.paymentExpiresAt > now
      ) return

      const result = await repository.updateEnrollmentStatus(
        enrollment.id,
        enrollment.appId,
        [ENROLLMENT_STATUS.PENDING_PAYMENT],
        ENROLLMENT_STATUS.EXPIRED,
        tx,
      )
      if (result.count !== 1) return

      const updated = await repository.findEnrollmentById(enrollment.id, enrollment.appId, tx)
      await emit({
        db: tx,
        event: ENROLLMENT_EVENTS.EXPIRED,
        enrollment: updated,
        context: { paymentExpiresAt: enrollment.paymentExpiresAt.toISOString() },
      })
      count += 1
    })
  }

  return { scanned: expired.length, expired: count }
}

const markExpiredSessionsMissed = async ({ now = new Date() } = {}) => {
  const sessions = await repository.findExpiredSessions(now)
  let count = 0

  for (const candidate of sessions) {
    await runTransaction(async (tx) => {
      const session = await repository.findSession(candidate.id, candidate.appId, tx)
      if (!session || session.status !== SESSION_STATUS.SCHEDULED || session.scheduledEnd > now) return

      const attendanceStatus = session.attendance?.status
      const result = await repository.updateSession(
        session.id,
        candidate.appId,
        { status: attendanceStatus === 'ABSENT' ? SESSION_STATUS.MISSED : SESSION_STATUS.MISSED },
        tx,
      )
      if (result.count !== 1) return

      await advanceAfterSession({
        appId: candidate.appId,
        enrollmentId: session.enrollmentId,
        sessionId: session.id,
        outcome: SESSION_STATUS.MISSED,
        db: tx,
      })
      count += 1
    })
  }

  return { scanned: sessions.length, missed: count }
}

const runLifecycleMaintenance = async ({ now = new Date() } = {}) => ({
  expiredEnrollments: await expirePendingEnrollments({ now }),
  missedSessions: await markExpiredSessionsMissed({ now }),
})

export {
  confirmEnrollment,
  ensureInProgress,
  advanceAfterSession,
  expirePendingEnrollments,
  markExpiredSessionsMissed,
  runLifecycleMaintenance,
}
