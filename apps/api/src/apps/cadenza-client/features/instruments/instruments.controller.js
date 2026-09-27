import { instrumentsService } from './instruments.services.js';

export const instrumentsController = {
  async getInstruments(req, res, next) {
    try {
      const instruments = await instrumentsService.getInstruments(
        req.appContext.id,
        {
          status: req.query.status,
          instrumentType: req.query.instrumentType,
        },
      );

      return res.json({
        success: true,
        data: instruments,
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstrumentById(req, res, next) {
    try {
      const instrument = await instrumentsService.getInstrumentById(
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

  async createInstrument(req, res, next) {
    try {
      const instrument = await instrumentsService.createInstrument(
        req.appContext.id,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: 'Instrument created successfully',
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateInstrument(req, res, next) {
    try {
      const instrument = await instrumentsService.updateInstrument(
        req.appContext.id,
        req.params.id,
        req.body,
      );

      return res.json({
        success: true,
        message: 'Instrument updated successfully',
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  },

  async deactivateInstrument(req, res, next) {
    try {
      const instrument = await instrumentsService.deactivateInstrument(
        req.appContext.id,
        req.params.id,
      );

      return res.json({
        success: true,
        message: 'Instrument retired successfully',
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  },
};
