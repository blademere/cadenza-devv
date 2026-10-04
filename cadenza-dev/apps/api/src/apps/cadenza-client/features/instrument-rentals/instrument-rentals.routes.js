import { Router } from 'express';

import {
  requireAdminOrFrontDesk,
  requireClient,
  requireClientOrStaff,
} from '../auth/authorization.js';

import { instrumentRentalsController } from './instrument-rentals.controller.js';

import {
  idValidator,
  availabilityValidator,
  createRentalValidator,
  cancelRentalValidator,
} from './instrument-rentals.validation.js';

const router = Router();

router.get(
  '/available',
  requireClient,
  instrumentRentalsController.getAvailableInstruments,
);

router.get(
  '/available/:id',
  requireClient,
  idValidator,
  instrumentRentalsController.getAvailableInstrumentById,
);

router.get(
  '/check-availability',
  requireClient,
  availabilityValidator,
  instrumentRentalsController.checkInstrumentAvailability,
);

router.get(
  '/packages',
  requireClientOrStaff,
  instrumentRentalsController.getRentalPackages,
);

router.get(
  '/packages/:id',
  requireClientOrStaff,
  idValidator,
  instrumentRentalsController.getRentalPackageById,
);

router.get(
  '/mine',
  requireClient,
  instrumentRentalsController.getMyInstrumentRentals,
);

router.get(
  '/mine/:id',
  requireClient,
  idValidator,
  instrumentRentalsController.getMyInstrumentRentalById,
);

router.post(
  '/',
  requireClient,
  createRentalValidator,
  instrumentRentalsController.createInstrumentRental,
);

router.patch(
  '/:id/cancel',
  requireClient,
  idValidator,
  cancelRentalValidator,
  instrumentRentalsController.cancelInstrumentRental,
);

router.get(
  '/',
  requireAdminOrFrontDesk,
  instrumentRentalsController.getInstrumentRentals,
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  idValidator,
  instrumentRentalsController.getInstrumentRentalById,
);

export default router;