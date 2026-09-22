import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/lessons/lesson.repository.js', () => ({
  findEnrollmentById: vi.fn(),
  confirmEnrollment: vi.fn(),
  updateEnrollmentStatus: vi.fn(),
  countConsumedSessions: vi.fn(),
  findExpiredPendingEnrollments: vi.fn(),
  findExpiredSessions: vi.fn(),
  findSession: vi.fn(),
  updateSession: vi.fn(),
}))

vi.mock('../../../src/platform/event-bus/event-outbox.service.js', () => ({
  enqueueEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
}))

vi.mock('../../../src/platform/transactions/transaction.service.js', () => ({
  run: vi.fn(async (callback) => callback({ transaction: true })),
}))

const repository = await import('../../../src/apps/cadenza/lessons/lesson.repository.js')
const eventBus = await import('../../../src/platform/event-bus/event-outbox.service.js')
const lifecycle = await import('../../../src/apps/cadenza/lessons/lesson-lifecycle.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('Cadenza enrollment lifecycle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('confirms a pending enrollment and records a durable event', async () => {
    const enrollment = { id: 'enrollment-1', appId: APP_ID, status: 'PENDING_PAYMENT', paymentExpiresAt: null }
    const confirmed = { ...enrollment, status: 'CONFIRMED', paymentExpiresAt: null }
    repository.findEnrollmentById.mockResolvedValueOnce(enrollment).mockResolvedValueOnce(confirmed)
    repository.confirmEnrollment.mockResolvedValue({ count: 1 })

    await lifecycle.confirmEnrollment({ appId: APP_ID, enrollmentId: enrollment.id, db: { transaction: true } })

    expect(repository.confirmEnrollment).toHaveBeenCalled()
    expect(eventBus.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'cadenza.enrollment.confirmed',
      entityId: enrollment.id,
    }))
  })

  it('moves a confirmed enrollment to in progress when the first session is consumed', async () => {
    const enrollment = {
      id: 'enrollment-2',
      appId: APP_ID,
      status: 'CONFIRMED',
      lessonPackage: { numberOfSessions: 4 },
    }
    const progressed = { ...enrollment, status: 'IN_PROGRESS' }
    repository.findEnrollmentById.mockResolvedValueOnce(enrollment).mockResolvedValueOnce(progressed)
    repository.countConsumedSessions.mockResolvedValue(1)
    repository.updateEnrollmentStatus.mockResolvedValue({ count: 1 })

    await lifecycle.advanceAfterSession({
      appId: APP_ID,
      enrollmentId: enrollment.id,
      sessionId: 'session-1',
      outcome: 'COMPLETED',
      db: { transaction: true },
    })

    expect(repository.updateEnrollmentStatus).toHaveBeenCalledWith(
      enrollment.id,
      APP_ID,
      ['CONFIRMED'],
      'IN_PROGRESS',
      expect.anything(),
    )
    expect(eventBus.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'cadenza.enrollment.in_progress',
    }))
  })

  it('completes an enrollment after the final consumed session', async () => {
    const enrollment = {
      id: 'enrollment-3',
      appId: APP_ID,
      status: 'IN_PROGRESS',
      lessonPackage: { numberOfSessions: 2 },
    }
    const completed = { ...enrollment, status: 'COMPLETED' }
    repository.findEnrollmentById.mockResolvedValueOnce(enrollment).mockResolvedValueOnce(completed)
    repository.countConsumedSessions.mockResolvedValue(2)
    repository.updateEnrollmentStatus.mockResolvedValue({ count: 1 })

    await lifecycle.advanceAfterSession({
      appId: APP_ID,
      enrollmentId: enrollment.id,
      sessionId: 'session-2',
      outcome: 'COMPLETED',
      db: { transaction: true },
    })

    expect(repository.updateEnrollmentStatus).toHaveBeenCalledWith(
      enrollment.id,
      APP_ID,
      ['CONFIRMED', 'IN_PROGRESS'],
      'COMPLETED',
      expect.anything(),
    )
    expect(eventBus.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'cadenza.enrollment.completed',
    }))
  })

  it('expires unpaid enrollments and emits an event', async () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    repository.findExpiredPendingEnrollments.mockResolvedValue([{ id: 'enrollment-4', appId: APP_ID }])
    repository.findEnrollmentById.mockResolvedValue({
      id: 'enrollment-4',
      appId: APP_ID,
      status: 'PENDING_PAYMENT',
      paymentExpiresAt: new Date('2026-09-21T00:00:00.000Z'),
    })
    repository.updateEnrollmentStatus.mockResolvedValue({ count: 1 })

    const result = await lifecycle.expirePendingEnrollments({ now })

    expect(result).toEqual({ scanned: 1, expired: 1 })
    expect(repository.updateEnrollmentStatus).toHaveBeenCalledWith(
      'enrollment-4',
      APP_ID,
      ['PENDING_PAYMENT'],
      'EXPIRED',
      expect.anything(),
    )
    expect(eventBus.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'cadenza.enrollment.expired',
    }))
  })

  it('marks a finished unrecorded lesson as missed and advances the enrollment', async () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    repository.findExpiredSessions.mockResolvedValue([{ id: 'session-5', appId: APP_ID, enrollmentId: 'enrollment-5' }])
    repository.findSession.mockResolvedValue({
      id: 'session-5',
      appId: APP_ID,
      enrollmentId: 'enrollment-5',
      status: 'SCHEDULED',
      scheduledEnd: new Date('2026-09-21T23:00:00.000Z'),
      attendance: null,
    })
    repository.updateSession.mockResolvedValue({ count: 1 })
    repository.findEnrollmentById.mockResolvedValue({
      id: 'enrollment-5',
      appId: APP_ID,
      status: 'IN_PROGRESS',
      lessonPackage: { numberOfSessions: 4 },
    })
    repository.countConsumedSessions.mockResolvedValue(1)

    const result = await lifecycle.markExpiredSessionsMissed({ now })

    expect(result).toEqual({ scanned: 1, missed: 1 })
    expect(repository.updateSession).toHaveBeenCalledWith(
      'session-5',
      APP_ID,
      { status: 'MISSED' },
      expect.anything(),
    )
    expect(eventBus.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'cadenza.enrollment.session_missed',
    }))
  })
})
