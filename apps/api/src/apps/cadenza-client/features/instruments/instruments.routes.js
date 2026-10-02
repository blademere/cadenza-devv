import { Router } from 'express';

import {
  requireAdmin,
  requireAdminOrFrontDesk,
} from '../auth/authorization.js';

import { instrumentsController } from './instruments.controller.js';

const router = Router();

router.get('/', requireAdminOrFrontDesk, instrumentsController.getInstruments);

router.get(
  '/:id',
  requireAdminOrFrontDesk,
  instrumentsController.getInstrumentById,
);

router.post('/', requireAdmin, instrumentsController.createInstrument);

router.patch('/:id', requireAdmin, instrumentsController.updateInstrument);

router.patch(
  '/:id/deactivate',
  requireAdmin,
  instrumentsController.deactivateInstrument,
);

export default router;
