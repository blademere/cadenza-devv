import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import * as lessonRepository from '../lessons/lesson.repository.js'
import * as rentalRepository from '../rentals/rental.repository.js'
import { listObligationsByApp } from '../../../platform/payments/payment.repository.js'
import { ENROLLMENT_STATUS, RENTAL_STATUS } from '../cadenza.constants.js'

const getDashboard = async ({ appId, actorId }) => {
  const owner = requireAppId(appId)
  const manager = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_authorization', action: 'manage' })
  const frontdesk = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'schedule' })
  const instructor = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_lessons', action: 'attendance' })
  const sessions = await lessonRepository.listSessions(owner)
  const enrollments = await lessonRepository.listEnrollments(owner)
  const rentals = await rentalRepository.list(owner)
  const obligations = await listObligationsByApp(owner)
  const today = new Date()
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)
  const todaysSessions = sessions.filter((session) => new Date(session.scheduledStart) >= today && new Date(session.scheduledStart) <= endOfDay)
  const pendingEnrollments = enrollments.filter((item) => item.status === ENROLLMENT_STATUS.PENDING_PAYMENT)
  const outstandingPayments = obligations.filter((item) => ['UNPAID', 'PARTIALLY_PAID'].includes(item.status))
  const openRentals = rentals.filter((item) => [RENTAL_STATUS.RESERVED, RENTAL_STATUS.CHECKED_OUT].includes(item.status))
  const base = { today: { sessions: todaysSessions.length }, outstandingPayments: outstandingPayments.length, openRentals: openRentals.length }
  if (manager || frontdesk) {
    return { ...base, pendingEnrollments: pendingEnrollments.length, todaysSessions, pendingEnrollmentsList: pendingEnrollments.slice(0, 10), rentals: rentals.slice(0, 10) }
  }
  if (instructor) {
    const mine = sessions.filter((session) => Number(session.instructor?.person?.userId) === Number(actorId))
    return { ...base, assignedSessions: mine.slice(0, 20), attendancePending: mine.filter((session) => session.status === 'SCHEDULED' && !session.attendance).length }
  }
  const studentEnrollments = enrollments.filter((item) => Number(item.student?.person?.userId) === Number(actorId))
  const studentRentals = rentals.filter((item) => Number(item.customerUserId) === Number(actorId))
  const studentObligations = obligations.filter((item) => studentEnrollments.some((enrollment) => enrollment.paymentObligationId === item.id) || studentRentals.some((rental) => rental.paymentObligationId === item.id))
  return { ...base, enrollments: studentEnrollments.slice(0, 10), rentals: studentRentals.slice(0, 10), payments: studentObligations.slice(0, 10) }
}
export { getDashboard }