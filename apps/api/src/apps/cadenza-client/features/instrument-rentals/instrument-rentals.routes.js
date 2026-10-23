import { Router } from 'express';

import {
  requireAdminOrFrontDesk,
  requireClient,
  requireClientOrStaff,
  requireFrontDesk,
} from '../auth/authorization.js';

import { instrumentRentalsController } from './instrument-rentals.controller.js';

import {
  idValidator,
  availabilityValidator,
  createRentalValidator,
  cancelRentalValidator,
  returnRentalValidator,
  receiveRentalValidator,
  walkInRentalValidator,
} from './instrument-rentals.validation.js';

const router = Router();

router.get(
  '/return-conditions',
  requireAdminOrFrontDesk,
  instrumentRentalsController.getReturnConditions,
);

router.get(
  '/available',
  requireClient,
  instrumentRentalsController.getAvailableInstruments,
);

router.get(
  '/reserved/:id',
  requireClient,
  idValidator,
  instrumentRentalsController.getReservedTimes,
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

router.post(
  '/walk-in',
  requireFrontDesk,
  walkInRentalValidator,
  instrumentRentalsController.createWalkInRental,
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

router.patch(
  '/:id/approve',
  requireAdminOrFrontDesk,
  idValidator,
  instrumentRentalsController.approveInstrumentRental,
);

router.patch(
  '/:id/return',
  requireAdminOrFrontDesk,
  returnRentalValidator,
  instrumentRentalsController.returnInstrumentRental,
);

router.patch(
  '/:id/receive',
  requireAdminOrFrontDesk,
  receiveRentalValidator,
  instrumentRentalsController.receiveInstrumentRental,
);

router.patch(
  '/:id/cancel-by-staff',
  requireAdminOrFrontDesk,
  idValidator,
  instrumentRentalsController.cancelStaffInstrumentRental,
);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  idValidator,
  instrumentRentalsController.getInstrumentRentalById,
);

export default router;
