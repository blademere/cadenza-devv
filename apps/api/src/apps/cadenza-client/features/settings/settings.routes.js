import { Router } from 'express';

import { requireAdmin } from '../auth/authorization.js';
import { settingsController } from './settings.controller.js';

const router = Router();

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

export default router;
