import express from 'express';

import {
  asyncHandler,
  idempotency,
  validate,
} from '../../../../common/middleware/index.js';

import { requireClient } from '../auth/authorization.js';

import * as controller from './room-booking.controller.js';

import {
  idValidator,
  scheduleValidator,
  createValidator,
  cancelValidator,
} from './room-bookings.validation.js';

const router = express.Router();

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
