import { apiClient } from '@/core/api/apiClient';
import { getMyEnrollment } from '@/pages/client/enrollments/services/enrollmentServices';
import roomBookingService from '@/pages/client/room-bookings/services/roomBookingsService';
import { getMyInstrumentRentals } from '@/pages/client/instrument-rentals/services/instrument-rental.service';

const asList = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const normalizedStatus = (value) => String(value || 'PENDING').toUpperCase();
const statusLabel = (value) => normalizedStatus(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const updatedAt = (record) => record.updatedAt || record.createdAt || record.scheduledStart || new Date().toISOString();

const enrollmentNotification = (enrollment) => {
  const status = normalizedStatus(enrollment.status);
  const name = enrollment.packageName || 'your lesson enrollment';
  const messages = {
    FOR_APPROVAL: ['Enrollment submitted', `Your ${name} is waiting for Front Desk confirmation.`],
    PENDING: ['Enrollment pending', `Your ${name} is still waiting for confirmation.`],
    PENDING_PAYMENT: ['Enrollment payment required', `Complete the payment for your ${name} to continue.`],
    APPROVED: ['Enrollment approved', `Your ${name} has been approved.`],
    ACTIVE: ['Enrollment active', `Your ${name} is active. Check your schedule for upcoming lessons.`],
    REJECTED: ['Enrollment not approved', `Your ${name} was not approved. Review the enrollment details for more information.`],
    CANCELLED: ['Enrollment cancelled', `Your ${name} has been cancelled.`],
  };
  const [title, message] = messages[status] || ['Enrollment updated', `Your ${name} status is now ${statusLabel(status)}.`];
  const reason = status === 'CANCELLED' ? enrollment.metadata?.cancellationReason : null;
  return { id: `enrollment-${enrollment.id}-${status}`, type: 'ENROLLMENT', title, message: reason ? `${message} Reason: ${reason}` : message, status, href: `/client/enrollments/${enrollment.id}`, createdAt: updatedAt(enrollment) };
};

const roomBookingNotification = (booking) => {
  const status = normalizedStatus(booking.status);
  const room = booking.room?.name || booking.room?.roomType || 'your room booking';
  const messages = {
    FOR_APPROVAL: ['Room booking submitted', `Your ${room} booking is waiting for Front Desk confirmation.`],
    PENDING: ['Room booking pending', `Your ${room} booking is still waiting for confirmation.`],
    PENDING_PAYMENT: ['Room booking payment required', `Complete the payment for your ${room} booking to continue.`],
    PARTIALLY_PAID: ['Room booking payment incomplete', `Your ${room} booking has a remaining balance.`],
    PAID: ['Room booking submitted', `Your ${room} booking payment was received and is waiting for confirmation.`],
    APPROVED: ['Room booking approved', `Your ${room} booking has been approved.`],
    CONFIRMED: ['Room booking confirmed', `Your ${room} booking is confirmed.`],
    COMPLETED: ['Room booking completed', `Your ${room} booking has been completed.`],
    CANCELLED: ['Room booking cancelled', `Your ${room} booking has been cancelled.`],
  };
  const [title, message] = messages[status] || ['Room booking updated', `Your ${room} status is now ${statusLabel(status)}.`];
  const reason = status === 'CANCELLED' ? booking.metadata?.cancellationReason || booking.cancellationReason : null;
  return { id: `room-booking-${booking.id}-${status}`, type: 'BOOKING', title, message: reason ? `${message} Reason: ${reason}` : message, status, href: `/client/room-bookings/${booking.id}`, createdAt: updatedAt(booking) };
};

const rentalNotification = (rental) => {
  const status = normalizedStatus(rental.status);
  const instruments = rental.items?.map((item) => item.instrument?.name || [item.instrument?.brand, item.instrument?.model].filter(Boolean).join(' ')).filter(Boolean).join(', ');
  const name = instruments || rental.instrumentName || 'your instrument rental';
  const messages = {
    FOR_APPROVAL: ['Rental submitted', `Your ${name} is waiting for Front Desk confirmation.`],
    PENDING: ['Rental pending', `Your ${name} is still waiting for confirmation.`],
    PENDING_PAYMENT: ['Rental payment required', `Complete the payment for your ${name} to continue.`],
    PARTIALLY_PAID: ['Rental payment incomplete', `Your ${name} rental has a remaining balance.`],
    PAID: ['Rental submitted', `Your ${name} rental payment was received and is waiting for confirmation.`],
    APPROVED: ['Rental approved', `Your ${name} rental has been approved.`],
    ACTIVE: ['Rental active', `Your ${name} rental is now active.`],
    COMPLETED: ['Rental completed', `Your ${name} rental has been completed.`],
    REJECTED: ['Rental not approved', `Your ${name} rental was not approved.`],
    CANCELLED: ['Rental cancelled', `Your ${name} rental has been cancelled.`],
  };
  const [title, message] = messages[status] || ['Rental updated', `Your ${name} status is now ${statusLabel(status)}.`];
  const reason = status === 'CANCELLED' ? rental.metadata?.cancellationReason : null;
  return { id: `rental-${rental.id}-${status}`, type: 'RENTAL', title, message: reason ? `${message} Reason: ${reason}` : message, status, href: `/client/instrument-rentals/${rental.id}`, createdAt: updatedAt(rental) };
};

export async function getMyNotifications() {
  const results = await Promise.allSettled([
    getMyEnrollment(),
    roomBookingService.getMyRoomBookings(),
    getMyInstrumentRentals(),
    apiClient.get('/notifications'),
  ]);

  if (results.every((result) => result.status === 'rejected')) {
    throw results[0].reason || new Error('Unable to load client notifications.');
  }

  const [enrollments, bookings, rentals, savedResponse] = results.map((result) => result.status === 'fulfilled' ? result.value : []);
  const saved = savedResponse?.data?.data ?? savedResponse?.data ?? [];
  const refundNotifications = asList(saved).filter((item) => item.type === 'PAYMENT_REFUNDED').map((item) => {
    const transactionType = item.data?.transactionType;
    const id = item.data?.sourceId;
    const href = transactionType === 'ENROLLMENT'
      ? `/client/enrollments/${id}`
      : transactionType === 'ROOM_BOOKING'
        ? `/client/room-bookings/${id}`
        : `/client/instrument-rentals/${id}`;
    return {
      id: item.id,
      type: 'PAYMENT',
      title: item.title,
      message: item.message,
      status: 'REFUNDED',
      href: id ? href : '/client/notifications',
      createdAt: item.createdAt,
    };
  });
  return [
    ...refundNotifications,
    ...asList(enrollments).map(enrollmentNotification),
    ...asList(bookings).map(roomBookingNotification),
    ...asList(rentals).map(rentalNotification),
  ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
}
