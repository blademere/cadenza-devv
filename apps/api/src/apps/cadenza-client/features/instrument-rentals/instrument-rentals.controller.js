import { instrumentRentalsService } from './instrument-rentals.services.js';

export const instrumentRentalsController = {
  async getInstrumentRentals(req, res, next) {
    try {
      const instruments = await instrumentRentalsService.getInstrumentRentals(
        req.appContext.id,
      );

      return res.json({
        success: true,
        data: instruments,
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstrumentRentalById(req, res, next) {
    try {
      const instrument = await instrumentRentalsService.getInstrumentRentalById(
        req.appContext.id,
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

  async updateInstrumentRental(req, res, next) {
    try {
      const instrument = await instrumentRentalsService.updateInstrumentRental(
        req.appContext.id,
        req.params.id,
        req.body,
      );

      return res.json({
        success: true,
        message: 'Instrument rental configuration updated successfully',
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  },
};
