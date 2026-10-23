import { Router } from 'express';

import { requireAdmin, requireClientOrStaff } from '../auth/authorization.js';
import { settingsController } from './settings.controller.js';
import { uploadBankAccountQr } from './settings.upload.js';

const router = Router();

router.get('/operating-hours', requireClientOrStaff, settingsController.getOperatingHours);
router.get('/payment-accounts', requireClientOrStaff, settingsController.getPaymentBankAccounts);
router.get('/payment-accounts/:id/qr', requireClientOrStaff, settingsController.getPaymentBankAccountQr);
router.put('/operating-hours', requireAdmin, settingsController.updateOperatingHours);

router.get(
  '/item-categories',
  requireAdmin,
  settingsController.getItemCategories,
);

router.post(
  '/item-categories',
  requireAdmin,
  settingsController.createItemCategory,
);

router.patch(
  '/item-categories/:id',
  requireAdmin,
  settingsController.updateItemCategory,
);

router.get(
  '/instrument-types',
  requireAdmin,
  settingsController.getInstrumentTypes,
);

router.post(
  '/instrument-types',
  requireAdmin,
  settingsController.createInstrumentType,
);

router.patch(
  '/instrument-types/:id',
  requireAdmin,
  settingsController.updateInstrumentType,
);

router.get('/bank-accounts', requireAdmin, settingsController.getBankAccounts);
router.post(
  '/bank-accounts',
  requireAdmin,
  uploadBankAccountQr.single('qr'),
  settingsController.createBankAccount,
);
router.put(
  '/bank-accounts/:id/qr',
  requireAdmin,
  uploadBankAccountQr.single('qr'),
  settingsController.replaceBankAccountQr,
);
router.patch(
  '/bank-accounts/:id',
  requireAdmin,
  settingsController.updateBankAccount,
);
router.get(
  '/bank-accounts/:id/qr',
  requireAdmin,
  settingsController.getBankAccountQr,
);

export default router;
