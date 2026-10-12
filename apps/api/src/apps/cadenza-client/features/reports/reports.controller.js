import { reportsService } from './reports.service.js';

export const reportsController = {
  async getReport(req, res, next) {
    try {
      const report = await reportsService.getReport(req.cadenzaApp.id, {
        type: req.query.type,
        from: req.query.from,
        to: req.query.to,
      });
      return res.json({ success: true, data: report });
    } catch (error) {
      return next(error);
    }
  },
};
