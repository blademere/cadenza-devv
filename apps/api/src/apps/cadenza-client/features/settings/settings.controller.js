import { settingsService } from './settings.service.js';

export const settingsController = {
  async getOperatingHours(req, res, next) {
    try { return res.json({ success: true, data: await settingsService.getOperatingHours(req.cadenzaApp.id) }); } catch (error) { next(error); }
  },

  async updateOperatingHours(req, res, next) {
    try { return res.json({ success: true, message: 'Operating hours saved successfully.', data: await settingsService.updateOperatingHours(req.cadenzaApp.id, req.body) }); } catch (error) { next(error); }
  },

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

  async getBankAccounts(req, res, next) {
    try { return res.json({ success: true, data: await settingsService.getBankAccounts(req.cadenzaApp.id) }); } catch (error) { next(error); }
  },

  async getPaymentBankAccounts(req, res, next) {
    try { return res.json({ success: true, data: await settingsService.getPaymentBankAccounts(req.cadenzaApp.id) }); } catch (error) { next(error); }
  },

  async createBankAccount(req, res, next) {
    try {
      const data = await settingsService.createBankAccount(req.cadenzaApp.id, { bankName: req.body?.bankName, accountNumber: req.body?.accountNumber, file: req.file });
      return res.status(201).json({ success: true, message: 'Bank account added successfully.', data });
    } catch (error) { next(error); }
  },

  async updateBankAccount(req, res, next) {
    try {
      const data = await settingsService.updateBankAccount(req.cadenzaApp.id, req.params.id, req.body?.status);
      return res.json({ success: true, message: 'Bank account status updated successfully.', data });
    } catch (error) { next(error); }
  },

  async getBankAccountQr(req, res, next) {
    try {
      const { body, contentType, fileName } = await settingsService.getBankAccountQr(req.cadenzaApp.id, req.params.id);
      res.set('Content-Type', contentType);
      res.set('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
      return res.send(body);
    } catch (error) { next(error); }
  },

  async getPaymentBankAccountQr(req, res, next) {
    try {
      const { body, contentType, fileName } = await settingsService.getBankAccountQr(req.cadenzaApp.id, req.params.id, true);
      res.set('Content-Type', contentType);
      res.set('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
      return res.send(body);
    } catch (error) { next(error); }
  },
};
