import { randomUUID } from 'node:crypto';
import { assertUnusedPaymentReference } from '../billing-payments/payment-reference.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import * as repository from './room-booking.repository.js';
import { assertWithinOperatingHours } from '../settings/operating-hours.js';
import { settingsService } from '../settings/settings.service.js';
import { createWalkInCustomer } from '../walk-ins/walk-in-customer.service.js';

const validateSchedule = (scheduledStart, scheduledEnd) => {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestError(
      'scheduledStart and scheduledEnd must be valid dates.',
    );
  }

  if (end <= start) {
    throw new BadRequestError(
      'scheduledEnd must be later than scheduledStart.',
    );
  }

  if (end.getTime() - start.getTime() < 60 * 60 * 1000) {
    throw new BadRequestError('Room bookings must be at least 1 hour.');
  }

  return {
    scheduledStart: start,
    scheduledEnd: end,
  };
};

const manilaDateKey = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const assertClientBookingWindow = (scheduledStart) => {
  const now = new Date();
  if (scheduledStart.getTime() < now.getTime() + 30 * 60 * 1000) {
    throw new BadRequestError('Room bookings must start at least 30 minutes from now.');
  }
  const today = manilaDateKey(now);
  const startDate = manilaDateKey(scheduledStart);
  const day0 = Date.parse(`${today}T00:00:00Z`);
  const selectedDay = Date.parse(`${startDate}T00:00:00Z`);
  if (selectedDay >= day0 + 5 * 24 * 60 * 60 * 1000) {
    throw new BadRequestError('Room bookings are only allowed today through the next four calendar days.');
  }
};

const calculateTotalAmount = (
  rentalRate,
  rentalDurationHours,
  scheduledStart,
  scheduledEnd,
) => {
  if (rentalRate === null || rentalRate === undefined) {
    return 0;
  }

  const durationHours =
    (scheduledEnd.getTime() - scheduledStart.getTime()) /
    (1000 * 60 * 60);

  const rateDurationHours = Number(rentalDurationHours);

  if (!Number.isFinite(rateDurationHours) || rateDurationHours <= 0) {
    throw new BadRequestError(
      'The room rental duration is not configured correctly.',
    );
  }

  const billableUnits = Math.ceil(
    durationHours / rateDurationHours,
  );

  return Number(rentalRate) * billableUnits;
};

const ensureAvailable = async ({
  appId,
  roomId,
  scheduledStart,
  scheduledEnd,
}) => {
  const [bookings, sessions] = await Promise.all([
    repository.findOverlappingBookings({
      appId,
      roomId,
      scheduledStart,
      scheduledEnd,
    }),
    repository.findOverlappingSessions({
      appId,
      roomId,
      scheduledStart,
      scheduledEnd,
    }),
  ]);

  if (bookings.length > 0) {
    throw new ConflictError(
      'The room is already booked during the selected time.',
    );
  }

  if (sessions.length > 0) {
    throw new ConflictError(
      'The room is already assigned to a lesson during the selected time.',
    );
  }
};

const create = async ({
  appId,
  customerId,
  roomId,
  scheduledStart,
  scheduledEnd,
  paymentPlan,
  paymentMethod = 'QR_PLACEHOLDER',
  paymentReference,
  status = 'FOR_APPROVAL',
  metadata: additionalMetadata = {},
}) => {
  if (status !== 'APPROVED') await assertUnusedPaymentReference(appId, paymentReference, { minLength: 13, maxLength: 100, alphanumericOnly: true });
  const schedule = validateSchedule(
    scheduledStart,
    scheduledEnd,
  );
  if (status !== 'APPROVED') assertClientBookingWindow(schedule.scheduledStart);
  try { assertWithinOperatingHours(await settingsService.getOperatingHours(appId), schedule.scheduledStart, schedule.scheduledEnd); } catch (error) { throw new BadRequestError(error.message); }

  const [customer, room] = await Promise.all([
    repository.findCustomerById(customerId, appId),
    repository.findRoomById(roomId, appId),
  ]);

  if (!customer) {
    throw new NotFoundError('Customer not found.');
  }

  if (customer.status !== 'ACTIVE') {
    throw new BadRequestError('Customer is not active.');
  }

  if (!room) {
    throw new NotFoundError('Room not found.');
  }

  if (room.status !== 'AVAILABLE') {
    throw new ConflictError(
      'The selected room is not available for booking.',
    );
  }

  if (room.rentalRate === null || Number(room.rentalRate) <= 0) {
    throw new BadRequestError(
      'The selected room does not have a valid rental price configured.',
    );
  }

  await ensureAvailable({
    appId,
    roomId,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd,
  });

  const totalAmount = calculateTotalAmount(
    room.rentalRate,
    room.rentalDurationHours,
    schedule.scheduledStart,
    schedule.scheduledEnd,
  );

  const selectedPaymentPlan = paymentPlan || 'FULL_PAYMENT';
  const initialPaymentAmount =
    selectedPaymentPlan === 'DOWN_PAYMENT'
      ? totalAmount * 0.5
      : totalAmount;

  return repository.create({
    appId,
    customerId,
    roomId,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd,
    totalAmount,
    rateAtBooking: Number(room.rentalRate),
    durationHoursAtBooking: room.rentalDurationHours,
    roomNameAtBooking: room.metadata?.name || room.roomType,
    status,
    metadata: {
      ...additionalMetadata,
      paymentPlan: selectedPaymentPlan,
      paymentMethod,
      ...(paymentReference ? { paymentReference } : {}),
      paymentStatus: status === 'APPROVED' ? 'PAID' : 'PENDING_CONFIRMATION',
      ...(status === 'APPROVED' ? { paymentCompletedAt: new Date().toISOString() } : {}),
      initialPaymentAmount,
      remainingAmount: totalAmount - initialPaymentAmount,
    },
  });
};

const createWalkIn = async ({
  appId,
  customer,
  roomId,
  scheduledStart,
  scheduledEnd,
  paymentMethod = 'CASH',
  paymentReference = null,
}) => {
  if (paymentMethod === 'GCASH' && !paymentReference?.trim()) throw new BadRequestError('GCash reference is required.');
  if (paymentReference?.trim()) await assertUnusedPaymentReference(appId, paymentReference);
  const walkInCustomer = await createWalkInCustomer({ appId, ...customer });
  return create({
    appId,
    customerId: walkInCustomer.id,
    roomId,
    scheduledStart,
    scheduledEnd,
    paymentPlan: 'FULL_PAYMENT',
    paymentMethod,
    paymentReference: paymentReference?.trim() || `WALKIN-${randomUUID()}`,
    status: 'APPROVED',
    metadata: {
      walkIn: true,
      paymentMethod,
      paymentStatus: 'PAID',
      customerSnapshot: {
        firstName: walkInCustomer.person.firstName,
        lastName: walkInCustomer.person.lastName,
        phone: walkInCustomer.person.phone,
        email: walkInCustomer.person.email,
      },
    },
  });
};

const listMyBookings = async ({
  appId,
  customerId,
}) =>
  repository.listByCustomer(
    customerId,
    appId,
  );

const listAllBookings = async ({ appId }) => repository.listAll(appId);

const approveBooking = async ({ appId, id }) => {
  const bookings = await repository.listAll(appId);
  const booking = bookings.find(
    (item) =>
      item.id === id &&
      [
        'FOR_APPROVAL',
        'PENDING',
        'PENDING_PAYMENT',
        'PENDING_CONFIRMATION',
        'PARTIALLY_PAID',
      ].includes(item.status),
  );

  if (!booking) {
    throw new NotFoundError('Room booking waiting for approval was not found.');
  }

  const metadata = booking.metadata || {};
  const paymentPlan = metadata.paymentPlan === 'DOWN_PAYMENT'
    ? 'DOWN_PAYMENT'
    : 'FULL_PAYMENT';
  const totalAmount = Number(booking.totalAmount || 0);
  const initialPaymentAmount = Number(
    metadata.initialPaymentAmount ||
      (paymentPlan === 'DOWN_PAYMENT' ? totalAmount * 0.5 : totalAmount),
  );
  const paymentContinuationRequired = paymentPlan === 'DOWN_PAYMENT';

  const approved = await repository.updateStaffDecision(id, appId, {
    status: 'APPROVED',
    metadata: {
      ...metadata,
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString(),
      paymentContinuationRequired,
      paymentContinuationStatus: paymentContinuationRequired
        ? 'PENDING'
        : 'NOT_REQUIRED',
      remainingAmount: paymentContinuationRequired
        ? Math.max(totalAmount - initialPaymentAmount, 0)
        : 0,
    },
  });

  if (!approved) {
    throw new ConflictError('This room booking has already been processed.');
  }

  return approved;
};

const cancelStaffBooking = async ({ appId, id, cancellationReason }) => {
  if (
    typeof cancellationReason !== 'string' ||
    cancellationReason.trim().length < 3
  ) {
    throw new BadRequestError(
      'A cancellation reason of at least 3 characters is required.',
    );
  }

  const bookings = await repository.listAll(appId);
  const booking = bookings.find(
    (item) =>
      item.id === id &&
      [
        'FOR_APPROVAL',
        'PENDING',
        'PENDING_PAYMENT',
        'PENDING_CONFIRMATION',
        'PARTIALLY_PAID',
      ].includes(item.status),
  );

  if (!booking) {
    throw new NotFoundError('Room booking waiting for approval was not found.');
  }

  const cancelled = await repository.updateStaffDecision(id, appId, {
    status: 'CANCELLED',
    metadata: {
      ...(booking.metadata || {}),
      approvalStatus: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      cancellationReason: cancellationReason.trim(),
    },
  });

  if (!cancelled) {
    throw new ConflictError('This room booking has already been processed.');
  }

  return cancelled;
};

const checkIn = async ({ appId, id, checkedInAt }) => {
  const bookings = await repository.listAll(appId);
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new NotFoundError('Room booking not found.');
  if (booking.status !== 'APPROVED') {
    throw new BadRequestError('Only approved room bookings can be checked in.');
  }

  const actualStart = new Date(checkedInAt);
  const originalStart = new Date(booking.scheduledStart);
  const originalEnd = new Date(booking.scheduledEnd);
  if (Number.isNaN(actualStart.getTime()) || actualStart >= originalEnd) {
    throw new BadRequestError('Check-in time must be before the booked end time.');
  }

  const bookedDuration = originalEnd.getTime() - originalStart.getTime();
  const adjustedEnd = new Date(actualStart.getTime() + bookedDuration);
  const bookedDurationMinutes = bookedDuration / 60000;
  const advanceMinutes = Math.max(
    0,
    (originalStart.getTime() - actualStart.getTime()) / 60000,
  );
  const ratePerMinute = Number(booking.totalAmount) / bookedDurationMinutes;
  const advanceAmount = Number.isFinite(ratePerMinute)
    ? advanceMinutes * ratePerMinute
    : 0;
  const updatedTotalAmount = Number(booking.totalAmount) + advanceAmount;
  const [overlappingBookings, overlappingSessions] = await Promise.all([
    repository.findOverlappingBookings({
      appId,
      roomId: booking.roomId,
      scheduledStart: actualStart,
      scheduledEnd: adjustedEnd,
      excludeId: id,
    }),
    repository.findOverlappingSessions({
      appId,
      roomId: booking.roomId,
      scheduledStart: actualStart,
      scheduledEnd: adjustedEnd,
    }),
  ]);
  if (overlappingBookings.length || overlappingSessions.length) {
    throw new ConflictError('The adjusted check-in time conflicts with another room booking or lesson.');
  }

  const result = await repository.updateCheckIn(id, appId, {
    status: 'CHECKED_IN',
    scheduledStart: actualStart,
    scheduledEnd: adjustedEnd,
    totalAmount: updatedTotalAmount,
    metadata: {
      ...(booking.metadata || {}),
      checkedInAt: actualStart.toISOString(),
      originalScheduledStart: originalStart.toISOString(),
      originalScheduledEnd: originalEnd.toISOString(),
      bookedDurationMinutes: Math.round(bookedDuration / 60000),
      advanceMinutes,
      advanceRatePerMinute: ratePerMinute,
      advanceAmount,
      originalTotalAmount: Number(booking.totalAmount),
    },
  });
  if (!result.count) throw new ConflictError('This room booking was already updated.');
  return repository.listAll(appId).then((items) => items.find((item) => item.id === id));
};

const checkOut = async ({ appId, id, checkedOutAt }) => {
  const bookings = await repository.listAll(appId);
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw new NotFoundError('Room booking not found.');
  if (booking.status !== 'CHECKED_IN') {
    throw new BadRequestError('Only checked-in room bookings can be checked out.');
  }

  const actualEnd = new Date(checkedOutAt);
  if (Number.isNaN(actualEnd.getTime()) || actualEnd < new Date(booking.scheduledStart)) {
    throw new BadRequestError('Check-out time must be on or after check-in time.');
  }

  // The snapshot rate and rate duration are authoritative for the booking.
  // Charge one additional rate unit for any fraction of a unit past the registered end.
  const bookedEnd = new Date(booking.metadata?.originalScheduledEnd || booking.scheduledEnd);
  const rate = Number(booking.rateAtBooking);
  const rateHours = Number(booking.durationHoursAtBooking);
  if (!Number.isFinite(bookedEnd.getTime()) || !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(rateHours) || rateHours <= 0) {
    throw new BadRequestError('Room rate or booking duration is invalid. Contact an administrator.');
  }
  const excessMinutes = Math.max(0, Math.ceil((actualEnd.getTime() - bookedEnd.getTime()) / 60000));
  const excessUnits = excessMinutes ? Math.ceil(excessMinutes / (rateHours * 60)) : 0;
  const excessAmount = Math.round((excessUnits * rate + Number.EPSILON) * 100) / 100;
  const originalTotal = Number(booking.totalAmount);
  if (!Number.isFinite(originalTotal) || originalTotal < 0) {
    throw new BadRequestError('The booking total is invalid.');
  }
  if (actualEnd.getTime() > Date.now() + 60 * 1000) {
    throw new BadRequestError('Check-out time cannot be in the future.');
  }
  if (booking.metadata?.checkedInAt && actualEnd < new Date(booking.metadata.checkedInAt)) {
    throw new BadRequestError('Check-out cannot precede the recorded check-in.');
  }
  const previousBalance = Number(booking.metadata?.paymentBalanceDue ?? booking.metadata?.remainingAmount ?? 0);
  const extraBalance = Number.isFinite(previousBalance) ? Math.max(0, previousBalance) + excessAmount : excessAmount;
  const result = await repository.updateCheckOut(id, appId, {
    status: 'COMPLETED',
    totalAmount: Math.round((originalTotal + excessAmount + Number.EPSILON) * 100) / 100,
    metadata: {
      ...(booking.metadata || {}),
      checkedOutAt: actualEnd.toISOString(),
      excessMinutes,
      excessUnits,
      excessRate: rate,
      excessRateDurationHours: rateHours,
      excessAmount,
      originalTotalAmount: originalTotal,
      remainingAmount: extraBalance,
      paymentBalanceDue: extraBalance,
      paymentContinuationRequired: extraBalance > 0,
      ...(extraBalance > 0 ? { paymentContinuationStatus: 'PENDING' } : {}),
    },
  });
  if (!result.count) throw new ConflictError('This room booking was already updated.');
  return repository.listAll(appId).then((items) => items.find((item) => item.id === id));
};

const getMyBooking = async ({
  appId,
  customerId,
  id,
}) => {
  const booking = await repository.findById(
    id,
    customerId,
    appId,
  );

  if (!booking) {
    throw new NotFoundError('Room booking not found.');
  }

  return booking;
};

const listAvailableRooms = async ({
  appId,
  scheduledStart,
  scheduledEnd,
}) => {
  const schedule = validateSchedule(
    scheduledStart,
    scheduledEnd,
  );
  assertClientBookingWindow(schedule.scheduledStart);

  return repository.listAvailableRooms({
    appId,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd,
  });
};

const cancel = async ({
  appId,
  customerId,
  id,
  cancellationReason,
}) => {
  const booking = await repository.findById(
    id,
    customerId,
    appId,
  );

  if (!booking) {
    throw new NotFoundError('Room booking not found.');
  }

  if (booking.status === 'CANCELLED') {
    throw new BadRequestError(
      'Room booking is already cancelled.',
    );
  }

  if (booking.status === 'COMPLETED') {
    throw new BadRequestError(
      'Completed room bookings cannot be cancelled.',
    );
  }

  const result = await repository.cancel(
    id,
    customerId,
    appId,
    {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason:
        cancellationReason?.trim() || null,
    },
  );

  if (result.count !== 1) {
    throw new ConflictError(
      'Room booking was modified or no longer exists.',
    );
  }

  return repository.findById(
    id,
    customerId,
    appId,
  );
};

export {
  create,
  createWalkIn,
  listMyBookings,
  listAllBookings,
  approveBooking,
  cancelStaffBooking,
  checkIn,
  checkOut,
  getMyBooking,
  listAvailableRooms,
  cancel,
};
