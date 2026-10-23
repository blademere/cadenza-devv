import { instrumentRentalsService } from './instrument-rentals.services.js';

const getClientId = (req) => {
  if (!req.cadenzaCustomer?.id) {
    throw new Error('Authenticated Cadenza client is required.');
  }

  return req.cadenzaCustomer.id;
};

export const instrumentRentalsController = {
  async getReturnConditions(req, res, next) {
    try {
      return res.json({
        success: true,
        data: instrumentRentalsService.getReturnConditions(),
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstrumentRentals(req, res, next) {
    try {
      const rentals =
        await instrumentRentalsService.getInstrumentRentals(
          req.cadenzaApp.id,
        );

      return res.json({
        success: true,
        data: rentals,
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstrumentRentalById(req, res, next) {
    try {
      const rental =
        await instrumentRentalsService.getInstrumentRentalById(
          req.cadenzaApp.id,
          req.params.id,
        );

      return res.json({
        success: true,
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveInstrumentRental(req, res, next) {
    try {
      const rental = await instrumentRentalsService.approveInstrumentRental(
        req.cadenzaApp.id,
        req.params.id,
      );

      return res.json({
        success: true,
        message: 'Instrument rental approved successfully.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async returnInstrumentRental(req, res, next) {
    try {
      const rental = await instrumentRentalsService.returnInstrumentRental(
        req.cadenzaApp.id,
        req.params.id,
        req.validated.body,
      );

      return res.json({
        success: true,
        message: 'Instrument rental marked as returned.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async receiveInstrumentRental(req, res, next) {
    try {
      const rental = await instrumentRentalsService.receiveInstrumentRental(
        req.cadenzaApp.id,
        req.params.id,
        req.validated.body,
      );
      return res.json({ success: true, message: 'Instrument handover recorded.', data: rental });
    } catch (error) {
      next(error);
    }
  },

  async cancelStaffInstrumentRental(req, res, next) {
    try {
      const rental = await instrumentRentalsService.cancelStaffInstrumentRental(
        req.cadenzaApp.id,
        req.params.id,
        req.body?.cancellationReason,
      );

      return res.json({
        success: true,
        message: 'Instrument rental cancelled successfully.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAvailableInstruments(req, res, next) {
    try {
      const instruments =
        await instrumentRentalsService.getAvailableInstruments(
          req.cadenzaApp.id,
        );

      return res.json({
        success: true,
        data: instruments,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAvailableInstrumentById(req, res, next) {
    try {
      const instrument =
        await instrumentRentalsService.getAvailableInstrumentById(
          req.cadenzaApp.id,
          req.params.id,
        );

      return res.json({
        success: true,
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReservedTimes(req, res, next) {
    try {
      const data = await instrumentRentalsService.getReservedTimes(req.cadenzaApp.id, req.params.id);
      return res.json({ success: true, data });
    } catch (error) { next(error); }
  },
  async checkInstrumentAvailability(req, res, next) {
    try {
      const instruments =
        await instrumentRentalsService.getAvailableInstruments(
          req.cadenzaApp.id,
          req.validated.query.scheduledStart,
          req.validated.query.scheduledEnd,
        );

      return res.json({
        success: true,
        data: instruments,
      });
    } catch (error) {
      next(error);
    }
  },

  async getRentalPackages(req, res, next) {
    try {
      const packages =
        await instrumentRentalsService.getRentalPackages(
          req.cadenzaApp.id,
        );

      return res.json({
        success: true,
        data: packages,
      });
    } catch (error) {
      next(error);
    }
  },

  async getRentalPackageById(req, res, next) {
    try {
      const rentalPackage =
        await instrumentRentalsService.getRentalPackageById(
          req.cadenzaApp.id,
          req.params.id,
        );

      return res.json({
        success: true,
        data: rentalPackage,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyInstrumentRentals(req, res, next) {
    try {
      const rentals =
        await instrumentRentalsService.getMyInstrumentRentals(
          req.cadenzaApp.id,
          getClientId(req),
        );

      return res.json({
        success: true,
        data: rentals,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyInstrumentRentalById(req, res, next) {
    try {
      const rental =
        await instrumentRentalsService.getMyInstrumentRentalById(
          req.cadenzaApp.id,
          getClientId(req),
          req.params.id,
        );

      return res.json({
        success: true,
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async createInstrumentRental(req, res, next) {
    try {
      const rental =
        await instrumentRentalsService.createInstrumentRental({
          appId: req.cadenzaApp.id,
          customerId: getClientId(req),
          ...req.validated.body,
        });

      return res.status(201).json({
        success: true,
        message: 'Instrument rental created successfully.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async createWalkInRental(req, res, next) {
    try {
      const rental = await instrumentRentalsService.createWalkInRental({
        appId: req.cadenzaApp.id,
        ...req.validated.body,
      });

      return res.status(201).json({
        success: true,
        message: 'Walk-in instrument rental created successfully.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelInstrumentRental(req, res, next) {
    try {
      const rental =
        await instrumentRentalsService.cancelInstrumentRental({
          appId: req.cadenzaApp.id,
          customerId: getClientId(req),
          id: req.params.id,
          cancellationReason:
            req.validated.body.cancellationReason,
        });

      return res.json({
        success: true,
        message: 'Instrument rental cancelled successfully.',
        data: rental,
      });
    } catch (error) {
      next(error);
    }
  },
};
