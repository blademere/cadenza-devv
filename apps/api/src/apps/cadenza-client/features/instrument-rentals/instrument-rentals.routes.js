import { Router } from 'express';

import authorize from '../../../../platform/authorization/authorization.middleware.js';

import { instrumentRentalsController } from './instrument-rentals.controller.js';

const router = Router();

router.get(
  '/',
  authorize('cadenza_instruments:read'),
  instrumentRentalsController.getInstrumentRentals,
);

router.get(
  '/:id',
  authorize('cadenza_instruments:read'),
  instrumentRentalsController.getInstrumentRentalById,
);

router.patch(
  '/:id',
  authorize('cadenza_instruments:update'),
  instrumentRentalsController.updateInstrumentRental,
);

export default router;
