import { Router } from 'express';
import authorize from '../../../../platform/authorization/authorization.middleware.js';
import { instrumentsController } from './instruments.controller.js';

const router = Router();

router.get(
  '/',
  authorize('cadenza_instruments:read'),
  instrumentsController.getInstruments,
);

router.get(
  '/:id',
  authorize('cadenza_instruments:read'),
  instrumentsController.getInstrumentById,
);

router.post(
  '/',
  authorize('cadenza_instruments:create'),
  instrumentsController.createInstrument,
);

router.patch(
  '/:id',
  authorize('cadenza_instruments:update'),
  instrumentsController.updateInstrument,
);

router.patch(
  '/:id/deactivate',
  authorize('cadenza_instruments:update'),
  instrumentsController.deactivateInstrument,
);

export default router;
