import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import { run as runTransaction } from '../../../platform/transactions/transaction.service.js'
import * as repository from './lesson.repository.js'
import { SESSION_STATUS } from '../cadenza.constants.js'

const TIME_ZONE = process.env.CADENZA_TIMEZONE || 'Asia/Manila'
const MIN_LEAD_MINUTES = 24 * 60
const MAX_SEARCH_DAYS = 370
const SLOT_INCREMENT_MINUTES = 15

const getLocalParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]))
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), dayOfWeek: weekdays[values.weekday], minute: Number(values.hour) * 60 + Number(values.minute) }
}
const fromLocalParts = ({ year, month, day, minute }) => {
  const guess = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess))
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]))
  const localAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute))
  return new Date(guess + (guess - localAsUtc))
}
const addLocalDays = (date, days) => { const p = getLocalParts(date); return fromLocalParts({ year: p.year, month: p.month, day: p.day + days, minute: p.minute }) }
const isBeforeLeadTime = (start) => start.getTime() - Date.now() < MIN_LEAD_MINUTES * 60 * 1000

const findSlot = async ({ appId, instructorId, rooms, rules, day, duration, notBefore, db }) => {
  for (const rule of rules.filter((item) => item.dayOfWeek === day.dayOfWeek)) {
    for (let minute = rule.startMinute; minute + duration <= rule.endMinute; minute += SLOT_INCREMENT_MINUTES) {
      const start = fromLocalParts({ year: day.year, month: day.month, day: day.day, minute })
      const end = fromLocalParts({ year: day.year, month: day.month, day: day.day, minute: minute + duration })
      if (isBeforeLeadTime(start) || (notBefore && start < notBefore)) continue
      if (await repository.findOverlappingSession({ appId, instructorId, startsAt: start, endsAt: end }, db)) continue
      for (const room of rooms) {
        if (await repository.findOverlappingSession({ appId, roomId: room.id, startsAt: start, endsAt: end }, db)) continue
        if (await repository.findRoomRentalOverlap({ appId, roomResourceId: room.resourceId, startsAt: start, endsAt: end }, db)) continue
        return { start, end, roomId: room.id }
      }
    }
  }
  return null
}

const generateSchedule = async ({ appId, actorId, enrollmentId, instructorId, roomId = null, startAt = null, regenerate = false, anchorSessionId = null, db = null }) => {
  const owner = requireAppId(appId)
  if (!(await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'schedule' }))) throw new ForbiddenError('Only users with lesson scheduling permission can generate lesson schedules.')
  const execute = async (tx) => {
    const enrollment = await repository.findEnrollmentById(enrollmentId, owner, tx)
    if (!enrollment || !['CONFIRMED', 'IN_PROGRESS'].includes(enrollment.status)) throw new NotFoundError('Confirmed enrollment not found.')
    const instructor = await repository.findInstructor(instructorId, owner, tx)
    if (!instructor) throw new NotFoundError('Instructor not found.')
    const rules = await repository.listInstructorAvailability(instructorId, owner, tx)
    if (!rules.length) throw new ConflictError('The instructor has no configured availability.')
    const duration = Number(enrollment.lessonPackage?.sessionDurationMinutes || 60)
    const sessionsPerWeek = Number(enrollment.lessonPackage?.sessionsPerWeek || 1)
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) throw new ConflictError('The lesson package has an invalid session duration.')
    if (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7) throw new ConflictError('The lesson package has an invalid sessions-per-week value.')
    const rooms = roomId ? [await repository.findRoom(roomId, owner, tx)] : await repository.listRooms(owner, tx)
    if (!rooms.length || rooms.some((room) => !room)) throw new ConflictError('No available lesson room can be used for the generated schedule.')
    let anchor = anchorSessionId ? await repository.findSession(anchorSessionId, owner, tx) : null
    if (anchor && anchor.enrollmentId !== enrollmentId) throw new BadRequestError('anchorSessionId does not belong to this enrollment.')
    if (regenerate) await repository.cancelFutureScheduledSessions(enrollmentId, owner, anchor ? anchor.scheduledEnd : new Date(), anchor?.id || null, tx)
    const refreshed = await repository.findEnrollmentById(enrollmentId, owner, tx)
    const total = Number(refreshed.lessonPackage?.numberOfSessions || 0)
    const consumed = await repository.countConsumedSessions(enrollmentId, owner, tx)
    const remaining = total - consumed
    if (remaining <= 0) return { generated: [], remaining: 0 }
    let cursor = startAt ? new Date(startAt) : new Date(Date.now() + MIN_LEAD_MINUTES * 60 * 1000)
    if (Number.isNaN(cursor.getTime())) throw new BadRequestError('startAt must be a valid date.')
    if (anchor) cursor = addLocalDays(anchor.scheduledEnd, 1)
    const generated = []
    for (let scanned = 0; generated.length < remaining && scanned < MAX_SEARCH_DAYS; scanned += 7) {
      let generatedThisWeek = 0
      for (let offset = 0; offset < 7 && generated.length < remaining && generatedThisWeek < sessionsPerWeek; offset += 1) {
        const day = getLocalParts(addLocalDays(cursor, offset))
        const slot = await findSlot({ appId: owner, instructorId, rooms, rules, day, duration, notBefore: cursor, db: tx })
        if (!slot) continue
        const created = await repository.createSession({ appId: owner, enrollmentId, instructorId, roomId: slot.roomId, scheduledStart: slot.start, scheduledEnd: slot.end, status: SESSION_STATUS.SCHEDULED, metadata: { generated: true, generator: 'availability', sessionsPerWeek, generatedAt: new Date().toISOString() } }, tx)
        generated.push(created)
        generatedThisWeek += 1
      }
      cursor = addLocalDays(cursor, 7)
    }
    if (generated.length < remaining) throw new ConflictError(`Unable to generate all remaining lesson sessions from instructor availability and room capacity. Generated ${generated.length} of ${remaining}.`)
    return { generated, remaining: 0, regenerated: Boolean(regenerate) }
  }
  return db ? execute(db) : runTransaction(execute)
}
export { generateSchedule, getLocalParts, fromLocalParts }