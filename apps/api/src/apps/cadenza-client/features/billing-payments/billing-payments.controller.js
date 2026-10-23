import { billingPaymentsService } from './billing-payments.service.js';
export const billingPaymentsController = {
  async listPayments(req, res, next) {
    try { return res.json({ success: true, data: await billingPaymentsService.listPayments(req.cadenzaApp.id) }); }
    catch (error) { return next(error); }
  },
  async getBookingRentalRefundQuote(req, res, next) {
    try {
      return res.json({ success: true, data: await billingPaymentsService.getBookingRentalRefundQuote(req.cadenzaApp.id, req.params.type, req.params.id) });
    } catch (error) { return next(error); }
  },
  async recordBookingRentalRefund(req, res, next) {
    try {
      return res.json({ success: true, data: await billingPaymentsService.recordBookingRentalRefund(req.cadenzaApp.id, req.user.id, req.params.type, req.params.id, req.body) });
    } catch (error) { return next(error); }
  },
  async getEnrollmentRefundQuote(req, res, next) {
    try {
      const result = await billingPaymentsService.getEnrollmentRefundQuote(req.cadenzaApp.id, req.params.id);
      return res.json({ success: true, data: result });
    } catch (error) { return next(error); }
  },
  async recordEnrollmentRefund(req, res, next) {
    try {
      const result = await billingPaymentsService.recordEnrollmentRefund(
        req.cadenzaApp.id, req.user.id, req.params.id, req.body,
      );
      return res.json({ success: true, data: result });
    } catch (error) { return next(error); }
  },
  async recordPayment(req, res, next) {
    try {
      const result = await billingPaymentsService.recordPayment(req.cadenzaApp.id, req.user.id, req.body);
      return res.json({ success: true, data: result });
    } catch (error) { return next(error); }
  },
};
