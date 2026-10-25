import { getMyEnrollment } from '../../enrollments/services/enrollmentServices';
import roomBookingService from '../../room-bookings/services/roomBookingsService';
import { getMyInstrumentRentals } from '../../instrument-rentals/services/instrument-rental.service';

let transactionCache = [];

const unwrapList = (value) => {
  const data = value?.data?.data ?? value?.data ?? value;
  return Array.isArray(data) ? data : data ? [data] : [];
};

const formatDate = (value) => {
  if (!value) {
    return 'Not available';
  }

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
  if (record.status === 'CANCELLED') return 'CANCELLED';
  if (['REJECTED', 'FAILED'].includes(status)) return 'REJECTED';
  if (status === 'REFUNDED') return 'REFUNDED';
  if (['PENDING_CONFIRMATION', 'PENDING_VERIFICATION', 'PENDING'].includes(status)) return 'PENDING_VERIFICATION';
  if (['PARTIALLY_PAID', 'PARTIAL'].includes(status)) return 'PARTIALLY_PAID';
  if (['PAID', 'SUCCEEDED', 'COMPLETED', 'SUCCESSFUL'].includes(status)) return 'PAID';
  return 'PENDING_VERIFICATION';
};
const amounts = (record, total) => {
  const metadata = record.metadata || {};
  // paymentAmount is the amount submitted/recorded for this transaction.
  // Pending verification must not hide a partial payment as ₱0.00.
  const submitted = Number(metadata.paymentAmount ?? metadata.initialPaymentAmount ?? 0) || 0;
  const paid = Math.min(total, Math.max(0, submitted));
  return { totalAmount: total, amountPaid: paid, remainingBalance: Math.max(0, total - paid), claimedAmount: paid };
};

const mapEnrollment = (enrollment) => {
  const metadata = enrollment.metadata || {};
  const serviceName =
    enrollment.packageName ||
    enrollment.lessons?.map((lesson) => lesson.name).join(', ') ||
    'Lesson enrollment';

  return {
    id: `ENROLLMENT-${enrollment.id}`,
    referenceNumber: metadata.paymentReference || enrollment.id,
    type: 'ENROLLMENT',
    description: `${serviceName} Enrollment`,
    serviceId: enrollment.id,
    serviceName,
    serviceDescription: 'Music lesson enrollment.',
    amount: Number(enrollment.priceAtEnrollment ?? enrollment.price ?? 0),
    ...amounts(enrollment, Number(enrollment.priceAtEnrollment ?? enrollment.price ?? 0)),
    currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR',
    paymentStatus: normalizePaymentStatus(enrollment),
    transactionDate: formatDate(enrollment.createdAt),
    paidAt: formatDate(metadata.paymentCompletedAt),
    rawDate: enrollment.createdAt,
    notes:
      metadata.paymentStatus === 'PENDING_CONFIRMATION'
        ? 'Payment reference submitted for front desk confirmation.'
        : 'Enrollment payment.',
  };
};

const mapRoomBooking = (booking) => {
  const metadata = booking.metadata || {};
  const serviceName =
    booking.room?.name || booking.room?.roomType || 'Room booking';

  return {
    id: `ROOM_BOOKING-${booking.id}`,
    referenceNumber: metadata.paymentReference || booking.id,
    type: 'ROOM_BOOKING',
    description: `${serviceName} Booking`,
    serviceId: booking.id,
    serviceName,
    serviceDescription: 'Music room booking.',
    amount: Number(booking.totalAmount || 0),
    ...amounts(booking, Number(booking.totalAmount || 0)),
    currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR',
    paymentStatus: normalizePaymentStatus(booking),
    transactionDate: formatDate(booking.createdAt || booking.scheduledStart),
    rawDate: booking.createdAt || booking.scheduledStart,
    paidAt: formatDate(metadata.paymentCompletedAt),
    notes: 'Room booking payment.',
  };
};

const mapRental = (rental) => {
  const metadata = rental.metadata || {};
  const serviceName = rental.instrumentName || 'Instrument rental';

  return {
    id: `INSTRUMENT_RENTAL-${rental.id}`,
    referenceNumber: metadata.paymentReference || rental.id,
    type: 'INSTRUMENT_RENTAL',
    description: `${serviceName} Rental`,
    serviceId: rental.id,
    serviceName,
    serviceDescription: 'Instrument rental.',
    amount: Number(rental.totalAmount || 0),
    ...amounts(rental, Number(rental.totalAmount || 0)),
    currency: 'PHP',
    paymentMethod: metadata.paymentMethod || 'QR',
    paymentStatus: normalizePaymentStatus(rental),
    transactionDate: formatDate(rental.createdAt || rental.scheduledStart),
    rawDate: rental.createdAt || rental.scheduledStart,
    paidAt: formatDate(metadata.paymentCompletedAt),
    notes: 'Instrument rental payment.',
  };
};

export async function getMyTransactions() {
  const results = await Promise.allSettled([
    getMyEnrollment(),
    roomBookingService.getMyRoomBookings(),
    getMyInstrumentRentals(),
  ]);

  const [enrollments, roomBookings, rentals] = results.map((result) =>
    result.status === 'fulfilled' ? unwrapList(result.value) : [],
  );

  transactionCache = [
    ...enrollments.map(mapEnrollment),
    ...roomBookings.map(mapRoomBooking),
    ...rentals.map(mapRental),
  ].sort((first, second) =>
    new Date(second.rawDate || 0) - new Date(first.rawDate || 0),
  );

  return transactionCache;
}

export async function getTransactionById(transactionId) {
  const cached = transactionCache.find((item) => item.id === transactionId);

  if (cached) {
    return cached;
  }

  const transactions = await getMyTransactions();
  const transaction = transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    throw new Error('Transaction not found.');
  }

  return transaction;
}
