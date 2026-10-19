import express from 'express';

import {
  asyncHandler,
  idempotency,
  validate,
} from '../../../../common/middleware/index.js';

import {
  requireAdminOrFrontDesk,
  requireClient,
  requireFrontDesk,
} from '../auth/authorization.js';

import * as controller from './room-booking.controller.js';

import {
  idValidator,
  scheduleValidator,
  createValidator,
  cancelValidator,
  checkInValidator,
  checkOutValidator,
  walkInCreateValidator,
} from './room-bookings.validation.js';

const router = express.Router();

router.get(
  '/',
  requireAdminOrFrontDesk,
  asyncHandler(controller.listAllBookings),
);

router.post(
  '/walk-in',
  requireFrontDesk,
  idempotency({ scope: 'cadenza-client-room-bookings-walk-in', required: true }),
  validate(walkInCreateValidator),
  asyncHandler(controller.createWalkIn),
);

router.patch(
  '/:id/approve',
  requireAdminOrFrontDesk,
  validate(idValidator),
  asyncHandler(controller.approveBooking),
);

router.patch(
  '/:id/cancel-by-staff',
  requireAdminOrFrontDesk,
  validate(idValidator),
  asyncHandler(controller.cancelStaffBooking),
);

router.patch(
  '/:id/check-in',
  requireAdminOrFrontDesk,
  validate(checkInValidator),
  asyncHandler(controller.checkIn),
);

router.patch(
  '/:id/check-out',
  requireAdminOrFrontDesk,
  validate(checkOutValidator),
  asyncHandler(controller.checkOut),
);

router.get(
  '/available',
  requireClient,
  validate(scheduleValidator),
  asyncHandler(controller.listAvailableRooms),
);

router.get('/mine', requireClient, asyncHandler(controller.listMyBookings));

router.post(
  '/',
  requireClient,
  idempotency({
    scope: 'cadenza-client-room-bookings',
    required: true,
  }),
  validate(createValidator),
  asyncHandler(controller.create),
);

router.get(
  '/:id',
  requireClient,
  validate(idValidator),
  asyncHandler(controller.getMyBooking),
);

router.patch(
  '/:id/cancel',
  requireClient,
  idempotency({
    scope: 'cadenza-client-room-bookings-cancel',
    required: true,
  }),
  validate(cancelValidator),
  asyncHandler(controller.cancel),
);

export default router;
