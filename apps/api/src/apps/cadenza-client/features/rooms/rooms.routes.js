import express from 'express';

import {
  asyncHandler,
  idempotency,
  validate,
} from '../../../../common/middleware/index.js';

import {
  requireAdmin,
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';

import * as controller from './rooms.controller.js';

import {
  createValidator,
  idValidator,
  updateValidator,
} from './rooms.validation.js';

const router = express.Router();

router.get('/', requireAdminOrFrontDesk, asyncHandler(controller.list));

router.post(
  '/',
  requireAdmin,
  idempotency({
    scope: 'cadenza-client-rooms',
    required: true,
  }),
  validate(createValidator),
  asyncHandler(controller.create),
);

router.patch(
  '/:id',
  requireAdmin,
  idempotency({
    scope: 'cadenza-client-rooms-update',
    required: true,
  }),
  validate(updateValidator),
  asyncHandler(controller.update),
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  validate(idValidator),
  asyncHandler(controller.get),
);

export default router;
