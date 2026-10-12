import { Router } from 'express';
import { requireAdminOrFrontDesk } from '../auth/authorization.js';
import { studentsController } from './students.controller.js';

const router = Router();

router.get('/', requireAdminOrFrontDesk, studentsController.getStudents);

export default router;
