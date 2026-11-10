import { Router } from 'express';
import { requireAdmin, requireAdminOrFrontDesk } from '../auth/authorization.js';
import { studentsController } from './students.controller.js';

const router = Router();

router.get('/', requireAdminOrFrontDesk, studentsController.getStudents);
router.patch('/:id/status', requireAdmin, studentsController.updateStatus);

export default router;
