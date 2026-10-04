import { settingsService } from './settings.service.js';

export const settingsController = {
  async getItemCategories(req, res, next) {
    try {
      const data = await settingsService.getItemCategories(req.cadenzaApp.id);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createItemCategory(req, res, next) {
    try {
      const data = await settingsService.createItemCategory(
        req.cadenzaApp.id,
        req.body,
      );
      return res.status(201).json({
        success: true,
        message: 'Item category created successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateItemCategory(req, res, next) {
    try {
      const data = await settingsService.updateItemCategory(
        req.cadenzaApp.id,
        req.params.id,
        req.body.status,
      );
      return res.json({
        success: true,
        message: 'Item category status updated successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getInstrumentTypes(req, res, next) {
    try {
      const data = await settingsService.getInstrumentTypes(
        req.cadenzaApp.id,
        req.query.status,
      );
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async createInstrumentType(req, res, next) {
    try {
      const data = await settingsService.createInstrumentType(
        req.cadenzaApp.id,
        req.body,
      );
      return res.status(201).json({
        success: true,
        message: 'Instrument type created successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateInstrumentType(req, res, next) {
    try {
      const data = await settingsService.updateInstrumentType(
        req.cadenzaApp.id,
        req.params.id,
        req.body.status,
      );
      return res.json({
        success: true,
        message: 'Instrument type status updated successfully.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};
