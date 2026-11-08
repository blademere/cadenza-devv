import { getMyEnrollment } from '../../enrollments/services/enrollmentServices';
import roomBookingService from '../../room-bookings/services/roomBookingsService';
import { getMyInstrumentRentals } from '../../instrument-rentals/services/instrument-rental.service';
import { mapEnrollment, mapEnrollmentPaymentHistory, mapRoomBooking, mapRental } from './billing.mapper';

let transactionCache = [];

const unwrapList = (value) => {
  const data = value?.data?.data ?? value?.data ?? value;
  return Array.isArray(data) ? data : data ? [data] : [];
};

const sortTransactions = (transactions) => transactions.sort((first, second) => {
  return new Date(second.rawDate || 0) - new Date(first.rawDate || 0);
});

export async function getMyTransactions() {
  const results = await Promise.allSettled([
    getMyEnrollment(),
    roomBookingService.getMyRoomBookings(),
    getMyInstrumentRentals(),
  ]);
  const [enrollments, roomBookings, rentals] = results.map((result) => result.status === 'fulfilled' ? unwrapList(result.value) : []);

  transactionCache = sortTransactions([
    ...enrollments.flatMap((enrollment) => [mapEnrollment(enrollment), ...mapEnrollmentPaymentHistory(enrollment)]),
    ...roomBookings.map(mapRoomBooking),
    ...rentals.map(mapRental),
  ]);
  return transactionCache;
}

export async function getTransactionById(transactionId) {
  const cached = transactionCache.find((item) => item.id === transactionId);
  if (cached) return cached;
  const transactions = await getMyTransactions();
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction) throw new Error('Transaction not found.');
  return transaction;
}
