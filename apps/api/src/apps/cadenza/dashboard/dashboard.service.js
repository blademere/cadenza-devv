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
  const customer = await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_enrollments', action: 'create' })

  const sessions = await lessonRepository.listSessions(owner)
  const enrollments = await lessonRepository.listEnrollments(owner)
  const rentals = await rentalRepository.list(owner)
  const obligations = await listObligationsByApp(owner)

  const today = new Date()
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)
  const todaysSessions = sessions.filter((session) => {
    const start = new Date(session.scheduledStart)
    return start >= today && start <= endOfDay
  })

  const pendingEnrollments = enrollments.filter((item) => item.status === ENROLLMENT_STATUS.PENDING_PAYMENT)
  const outstandingPayments = obligations.filter((item) => ['UNPAID', 'PARTIALLY_PAID'].includes(item.status))
  const openRentals = rentals.filter((item) => [RENTAL_STATUS.RESERVED, RENTAL_STATUS.CHECKED_OUT].includes(item.status))

  if (manager || frontdesk) {
    return {
      today: { sessions: todaysSessions.length },
      outstandingPayments: outstandingPayments.length,
      openRentals: openRentals.length,
      mode: 'operations',
      pendingEnrollments: pendingEnrollments.length,
      todaysSessions,
      pendingEnrollmentsList: pendingEnrollments.slice(0, 10),
      rentals: rentals.slice(0, 10),
    }
  }

  const mine = instructor
    ? sessions.filter((session) => Number(session.instructor?.person?.userId) === Number(actorId))
    : []

  const customerEnrollments = customer
    ? enrollments.filter((item) => Number(item.customer?.person?.userId) === Number(actorId))
    : []
  const customerRentals = customer
    ? rentals.filter((item) => Number(item.customer?.person?.userId) === Number(actorId))
    : []
  const customerObligations = customer
    ? obligations.filter(
        (item) =>
          customerEnrollments.some((enrollment) => enrollment.paymentObligationId === item.id) ||
          customerRentals.some((rental) => rental.paymentObligationId === item.id),
      )
    : []

  const visibleSessions = instructor ? mine : []
  const visibleEnrollments = customer ? customerEnrollments : []
  const visibleRentals = customer ? customerRentals : []
  const visibleObligations = customer ? customerObligations : []

  return {
    today: {
      sessions: visibleSessions.filter((session) => {
        const start = new Date(session.scheduledStart)
        return start >= today && start <= endOfDay
      }).length,
    },
    outstandingPayments: visibleObligations.filter((item) => ['UNPAID', 'PARTIALLY_PAID'].includes(item.status)).length,
    openRentals: visibleRentals.filter((item) => [RENTAL_STATUS.RESERVED, RENTAL_STATUS.CHECKED_OUT].includes(item.status)).length,
    ...(instructor
      ? {
          instructor: {
            assignedSessions: mine.slice(0, 20),
            attendancePending: mine.filter(
              (session) => session.status === 'SCHEDULED' && !session.attendance,
            ).length,
          },
        }
      : {}),
    ...(customer
      ? {
          customer: {
            enrollments: customerEnrollments.slice(0, 10),
            rentals: customerRentals.slice(0, 10),
            payments: customerObligations.slice(0, 10),
          },
        }
      : {}),
  }
}

export { getDashboard }