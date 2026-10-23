import { billingPaymentsService } from './billing-payments.service.js';
export const billingPaymentsController = {
  async listPayments(req, res, next) {
    try { return res.json({ success: true, data: await billingPaymentsService.listPayments(req.cadenzaApp.id) }); }
    catch (error) { return next(error); }
  },
  async recordPayment(req, res, next) {
    try {
      const result = await billingPaymentsService.recordPayment(req.cadenzaApp.id, req.user.id, req.body);
      return res.json({ success: true, data: result });
    } catch (error) { return next(error); }
  },
};
