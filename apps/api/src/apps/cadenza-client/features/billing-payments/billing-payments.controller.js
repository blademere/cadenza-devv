import { billingPaymentsService } from './billing-payments.service.js';

export const billingPaymentsController = {
  async markPaid(req, res, next) {
    try {
      const transaction = await billingPaymentsService.markPaid(
        req.cadenzaApp.id,
        req.body,
      );
      return res.json({
        success: true,
        message: 'Billing transaction marked as paid.',
        data: transaction,
      });
    } catch (error) {
      return next(error);
    }
  },
};
