const formatDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
};

const normalizePaymentStatus = (record) => {
  const status = String(record.metadata?.paymentStatus || '').toUpperCase();
  if (status === 'REFUNDED') return 'REFUNDED';
  if (record.status === 'CANCELLED') return 'CANCELLED';
  if (['REJECTED', 'FAILED'].includes(status)) return 'REJECTED';
  if (['PENDING_CONFIRMATION', 'PENDING_VERIFICATION', 'PENDING'].includes(status)) return 'PENDING_VERIFICATION';
  if (['PARTIALLY_PAID', 'PARTIAL'].includes(status)) return 'PARTIALLY_PAID';
  if (['PAID', 'SUCCEEDED', 'COMPLETED', 'SUCCESSFUL'].includes(status)) return 'PAID';
  return 'PENDING_VERIFICATION';
};

const amounts = (record, total) => {
  const metadata = record.metadata || {};
  const submitted = Number(metadata.paymentAmount ?? metadata.initialPaymentAmount ?? 0) || 0;
  const paid = Math.min(total, Math.max(0, submitted));
  return { totalAmount: total, amountPaid: paid, remainingBalance: Math.max(0, total - paid), claimedAmount: paid };
};

const refundDetails = (record) => {
  const metadata = record.metadata || {};
  if (String(metadata.paymentStatus || '').toUpperCase() !== 'REFUNDED') return {};
  return {
    refundAmount: Number(metadata.refundAmount || 0),
    refundReference: metadata.refundReference || 'Not provided',
    refundMethod: metadata.refundMethod || 'Not provided',
    refundedAt: formatDate(metadata.refundedAt),
  };
};

export const mapEnrollment = (enrollment) => {
  const metadata = enrollment.metadata || {};
  const serviceName = enrollment.packageName || enrollment.lessons?.map((lesson) => lesson.name).join(', ') || 'Lesson enrollment';
  const payment = enrollment.payment || {};
  const total = Number(payment.totalAmount ?? enrollment.priceAtEnrollment ?? enrollment.price ?? 0);
  const paid = Number(payment.paidAmount ?? 0);
  const paymentAmounts = payment.totalAmount != null
    ? { totalAmount: total, amountPaid: paid, remainingBalance: Math.max(0, Number(payment.remainingBalance ?? total - paid)), claimedAmount: paid }
    : amounts(enrollment, total);

  return {
    id: `ENROLLMENT-${enrollment.id}`,
    referenceNumber: metadata.paymentReference || enrollment.id,
    type: 'ENROLLMENT',
    description: `${serviceName} Enrollment`,
    serviceId: enrollment.id,
    serviceName,
    serviceDescription: 'Music lesson enrollment.',
    amount: total,
    ...paymentAmounts,
    ...refundDetails(enrollment),
    currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR',
    paymentStatus: normalizePaymentStatus(enrollment),
    nextPaymentDue: enrollment.payment?.nextPaymentDue || enrollment.paymentExpiresAt || metadata.paymentDueDate || null,
    transactionDate: formatDate(enrollment.createdAt),
    paidAt: formatDate(metadata.paymentCompletedAt),
    rawDate: metadata.refundedAt || enrollment.createdAt,
    notes: metadata.paymentStatus === 'PENDING_CONFIRMATION' ? 'Payment reference submitted for front desk confirmation.' : 'Enrollment payment.',
  };
};

export const mapEnrollmentPaymentHistory = (enrollment) => (enrollment.payment?.history || []).map((payment) => ({
  id: `ENROLLMENT-PAYMENT-${payment.id}`,
  referenceNumber: payment.reference || payment.id,
  type: 'ENROLLMENT_PAYMENT',
  description: `${enrollment.packageName || 'Enrollment'} payment`,
  serviceId: enrollment.id,
  serviceName: enrollment.packageName || 'Enrollment',
  serviceDescription: payment.source === 'INITIAL_PAYMENT' ? 'Initial enrollment payment.' : 'Front Desk payment recorded for enrollment.',
  amount: Number(payment.amount || 0),
  amountPaid: Number(payment.amount || 0),
  remainingBalance: Number(enrollment.payment?.remainingBalance || 0),
  currency: 'PHP',
  paymentMethod: payment.method || 'Not available',
  paymentStatus: 'RECORDED',
  nextPaymentDue: enrollment.payment?.nextPaymentDue || enrollment.paymentExpiresAt || enrollment.metadata?.paymentDueDate || null,
  transactionDate: formatDate(payment.createdAt),
  rawDate: payment.createdAt,
}));

export const mapRoomBooking = (booking) => {
  const metadata = booking.metadata || {};
  const serviceName = booking.room?.resource?.name || booking.roomNameAtBooking || booking.room?.roomName || booking.room?.roomType || 'Room booking';
  const total = Number(booking.totalAmount || 0);
  return {
    id: `ROOM_BOOKING-${booking.id}`, referenceNumber: metadata.paymentReference || booking.id, type: 'ROOM_BOOKING',
    description: `${serviceName} Booking`, serviceId: booking.id, serviceName, serviceDescription: 'Music room booking.',
    amount: total, ...amounts(booking, total), ...refundDetails(booking), currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR', paymentStatus: normalizePaymentStatus(booking),
    transactionDate: formatDate(booking.createdAt || booking.scheduledStart), rawDate: metadata.refundedAt || booking.createdAt || booking.scheduledStart,
    paidAt: formatDate(metadata.paymentCompletedAt), notes: 'Room booking payment.',
  };
};

export const mapRental = (rental) => {
  const metadata = rental.metadata || {};
  const itemNames = (Array.isArray(rental.items) ? rental.items : []).map((item) => item?.instrument?.name || item?.instrument?.instrumentType?.name || item?.instrumentName || item?.name).filter(Boolean);
  const serviceName = [...new Set(itemNames)].join(', ') || rental.instrumentName || 'Instrument rental';
  const total = Number(rental.totalAmount || 0);
  return {
    id: rental.id, referenceNumber: metadata.paymentReference || rental.id, type: 'INSTRUMENT_RENTAL',
    description: `${serviceName} Rental`, serviceId: rental.id, serviceName, serviceDescription: 'Instrument rental.',
    amount: total, ...amounts(rental, total), ...refundDetails(rental), currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR', paymentStatus: normalizePaymentStatus(rental),
    transactionDate: formatDate(rental.createdAt || rental.scheduledStart), rawDate: metadata.refundedAt || rental.createdAt || rental.scheduledStart,
    paidAt: formatDate(metadata.paymentCompletedAt), notes: 'Instrument rental payment.',
  };
};
