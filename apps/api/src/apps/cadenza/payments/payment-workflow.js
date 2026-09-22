import { compare } from '../../../platform/money/money.js'
import { getObligation } from '../../../platform/payments/payment.service.js'
import * as repository from './payment.repository.js'

const beforeRecord = async ({ appId, obligationId, amount }) => {
  const obligation = await getObligation(obligationId, appId)
  if (!obligation) throw new Error('Payment obligation not found.')
  if (obligation.referenceType === 'CADENZA_ENROLLMENT') {
    if (compare(amount, obligation.balanceDue) !== 0) {
      const error = new Error('Lesson enrollment requires full payment.')
      error.statusCode = 409
      throw error
    }
    const enrollment = await findEnrollmentById(obligation.referenceId, appId)
    if (!enrollment) throw new Error('Lesson enrollment not found.')
    if (enrollment.status === ENROLLMENT_STATUS.EXPIRED || (enrollment.paymentExpiresAt && enrollment.paymentExpiresAt <= new Date())) {
      const error = new Error('Lesson enrollment payment window has expired.')
      error.statusCode = 409
      throw error
    }
    if (![ENROLLMENT_STATUS.PENDING_PAYMENT, ENROLLMENT_STATUS.CONFIRMED, ENROLLMENT_STATUS.IN_PROGRESS].includes(enrollment.status)) {
      const error = new Error('Lesson enrollment cannot accept payment in its current state.')
      error.statusCode = 409
      throw error
    }
  }
}

const onSettled = async ({ db, obligation, paidAmount }) => {
  if (obligation.referenceType === 'CADENZA_ENROLLMENT' && obligation.status === 'PAID') {
    const enrollment = await findEnrollmentById(obligation.referenceId, obligation.appId, db)
    if (!enrollment) throw new Error('Lesson enrollment not found.')
    if (enrollment.status === ENROLLMENT_STATUS.EXPIRED || (enrollment.paymentExpiresAt && enrollment.paymentExpiresAt <= new Date())) {
      const error = new Error('Lesson enrollment payment window has expired.')
      error.statusCode = 409
      throw error
    }
    await confirmEnrollment({ appId: obligation.appId, enrollmentId: obligation.referenceId, db })
  }
  if (obligation.referenceType === 'CADENZA_RENTAL') {
    const rental = await repository.findRental(obligation.referenceId, obligation.appId, db)
    if (rental && compare(paidAmount, rental.requiredDownPayment) >= 0)
      await repository.reserveRental(rental.id, obligation.appId, db)
  }
}

export { beforeRecord, onSettled }
