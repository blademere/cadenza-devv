import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../../common/errors/appError.js';

import * as repository from './room-booking.repository.js';

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

  return {
    scheduledStart: start,
    scheduledEnd: end,
  };
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
  paymentPlan,
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
}) => {
  const schedule = validateSchedule(
    scheduledStart,
    scheduledEnd,
  );

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
    status:
      selectedPaymentPlan === 'DOWN_PAYMENT'
        ? 'PARTIALLY_PAID'
        : 'PAID',
    metadata: {
      paymentPlan: selectedPaymentPlan,
      paymentMethod: 'QR_PLACEHOLDER',
      paymentStatus:
        selectedPaymentPlan === 'DOWN_PAYMENT'
          ? 'PARTIALLY_PAID'
          : 'PAID',
      paymentCompletedAt: new Date().toISOString(),
      initialPaymentAmount,
      remainingAmount: totalAmount - initialPaymentAmount,
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
  listMyBookings,
  getMyBooking,
  listAvailableRooms,
  cancel,
};
