import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/lessons/lesson.repository.js', () => ({
  withTransaction: vi.fn(),
  findEnrollment: vi.fn(),
  lockEnrollment: vi.fn(),
  lockInstructor: vi.fn(),
  lockRoom: vi.fn(),
  lockSession: vi.fn(),
  lockReschedule: vi.fn(),
  findSession: vi.fn(),
  findReschedule: vi.fn(),
  updateSession: vi.fn(),
  updateReschedule: vi.fn(),
  findInstructor: vi.fn(),
  findRoom: vi.fn(),
  findOverlappingSession: vi.fn(),
  createSession: vi.fn(),
  listSessions: vi.fn(),
}))

const repository = await import('../../../src/apps/cadenza/lessons/lesson.repository.js')
const service = await import('../../../src/apps/cadenza/lessons/lesson.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const ENROLLMENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const INSTRUCTOR_ID = '550e8400-e29b-41d4-a716-446655440002'
const ROOM_ID = '550e8400-e29b-41d4-a716-446655440003'

describe('Cadenza lesson scheduling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schedules a session for a confirmed enrollment', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    repository.findEnrollment.mockResolvedValue({ id: ENROLLMENT_ID, status: 'CONFIRMED' })
    repository.lockEnrollment.mockResolvedValue([])
    repository.lockInstructor.mockResolvedValue([])
    repository.lockRoom.mockResolvedValue([])
    repository.findInstructor.mockResolvedValue({ id: INSTRUCTOR_ID, status: 'ACTIVE' })
    repository.findRoom.mockResolvedValue({ id: ROOM_ID, status: 'AVAILABLE' })
    repository.findOverlappingSession.mockResolvedValue(null)
    repository.createSession.mockResolvedValue({ id: 'session-1', status: 'SCHEDULED' })

    await expect(service.createSession({
      appId: APP_ID,
      enrollmentId: ENROLLMENT_ID,
      instructorId: INSTRUCTOR_ID,
      roomId: ROOM_ID,
      scheduledStart: '2026-09-21T09:00:00.000Z',
      scheduledEnd: '2026-09-21T10:00:00.000Z',
    })).resolves.toMatchObject({ id: 'session-1', status: 'SCHEDULED' })
    expect(repository.lockEnrollment).toHaveBeenCalledWith(ENROLLMENT_ID, APP_ID, expect.anything())
    expect(repository.lockInstructor).toHaveBeenCalledWith(INSTRUCTOR_ID, APP_ID, expect.anything())
    expect(repository.lockRoom).toHaveBeenCalledWith(ROOM_ID, APP_ID, expect.anything())

  })

  it('rejects scheduling beyond the lesson package session count', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    repository.findEnrollment.mockResolvedValue({
      id: ENROLLMENT_ID,
      status: 'CONFIRMED',
      lessonPackage: { numberOfSessions: 4 },
      _count: { sessions: 4 },
    })

    await expect(service.createSession({
      appId: APP_ID,
      enrollmentId: ENROLLMENT_ID,
      scheduledStart: '2026-09-21T09:00:00.000Z',
      scheduledEnd: '2026-09-21T10:00:00.000Z',
    })).rejects.toThrow('Lesson package session limit has been reached')

    expect(repository.findOverlappingSession).not.toHaveBeenCalled()
    expect(repository.createSession).not.toHaveBeenCalled()
  })

  it('rejects an instructor or room conflict', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    repository.findEnrollment.mockResolvedValue({ id: ENROLLMENT_ID, status: 'CONFIRMED' })
    repository.findInstructor.mockResolvedValue({ id: INSTRUCTOR_ID, status: 'ACTIVE' })
    repository.findRoom.mockResolvedValue({ id: ROOM_ID, status: 'AVAILABLE' })
    repository.findOverlappingSession.mockResolvedValue({ id: 'existing-session' })

    await expect(service.createSession({
      appId: APP_ID,
      enrollmentId: ENROLLMENT_ID,
      instructorId: INSTRUCTOR_ID,
      roomId: ROOM_ID,
      scheduledStart: '2026-09-21T09:00:00.000Z',
      scheduledEnd: '2026-09-21T10:00:00.000Z',
    })).rejects.toThrow('already scheduled for an overlapping lesson session')

    expect(repository.createSession).not.toHaveBeenCalled()
  })

  it('does not allow scheduling before full enrollment payment', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    repository.findEnrollment.mockResolvedValue(null)

    await expect(service.createSession({
      appId: APP_ID,
      enrollmentId: ENROLLMENT_ID,
      scheduledStart: '2026-09-21T09:00:00.000Z',
      scheduledEnd: '2026-09-21T10:00:00.000Z',
    })).rejects.toThrow('Confirmed enrollment not found')

    expect(repository.findOverlappingSession).not.toHaveBeenCalled()
  })

  it('serializes session state transitions with a row lock', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    repository.lockSession.mockResolvedValue([])
    repository.findSession
      .mockResolvedValueOnce({ id: 'session-1', status: 'SCHEDULED' })
      .mockResolvedValueOnce({ id: 'session-1', status: 'COMPLETED' })
    repository.updateSession.mockResolvedValue({ count: 1 })

    await expect(service.completeSession({ appId: APP_ID, id: 'session-1' }))
      .resolves.toMatchObject({ id: 'session-1', status: 'COMPLETED' })

    expect(repository.lockSession).toHaveBeenCalledWith('session-1', APP_ID, expect.anything())
    expect(repository.updateSession).toHaveBeenCalledWith(
      'session-1',
      APP_ID,
      { status: 'COMPLETED' },
      expect.anything(),
    )
  })

  it('locks resources and reschedule request before approving a reschedule', async () => {
    repository.withTransaction.mockImplementation((callback) => callback({}))
    const session = { id: 'session-1', status: 'SCHEDULED', instructorId: INSTRUCTOR_ID, roomId: ROOM_ID }
    const request = {
      id: 'request-1',
      sessionId: 'session-1',
      status: 'PENDING',
      requestedStart: new Date('2026-09-21T11:00:00.000Z'),
      requestedEnd: new Date('2026-09-21T12:00:00.000Z'),
    }
    repository.findReschedule
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce({ ...request, status: 'APPROVED' })
    repository.findSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session)
    repository.lockInstructor.mockResolvedValue([])
    repository.lockRoom.mockResolvedValue([])
    repository.lockSession.mockResolvedValue([])
    repository.lockReschedule.mockResolvedValue([])
    repository.findOverlappingSession.mockResolvedValue(null)
    repository.updateSession.mockResolvedValue({ count: 1 })
    repository.updateReschedule.mockResolvedValue({ count: 1 })

    await expect(service.reviewReschedule({
      appId: APP_ID,
      id: request.id,
      actorId: 99,
      approve: true,
    })).resolves.toMatchObject({ id: request.id, status: 'APPROVED' })

    expect(repository.lockInstructor).toHaveBeenCalledWith(INSTRUCTOR_ID, APP_ID, expect.anything())
    expect(repository.lockRoom).toHaveBeenCalledWith(ROOM_ID, APP_ID, expect.anything())
    expect(repository.lockSession).toHaveBeenCalledWith(session.id, APP_ID, expect.anything())
    expect(repository.lockReschedule).toHaveBeenCalledWith(request.id, APP_ID, expect.anything())
    expect(repository.findOverlappingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        instructorId: INSTRUCTOR_ID,
        roomId: ROOM_ID,
        excludeId: session.id,
      }),
      expect.anything(),
    )
  })

  it('rejects invalid time ranges', async () => {
    await expect(service.createSession({
      appId: APP_ID,
      enrollmentId: ENROLLMENT_ID,
      scheduledStart: '2026-09-21T10:00:00.000Z',
      scheduledEnd: '2026-09-21T09:00:00.000Z',
    })).rejects.toThrow('scheduledEnd must be after scheduledStart')
  })
})
