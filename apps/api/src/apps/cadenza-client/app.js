import express from 'express';

import authRoutes from './features/auth/auth.routes.js';
import cadenzaAuthenticate from './features/auth/authenticate.js';

import staffRoutes from './features/staff/staff.routes.js';
import roomsRoutes from './features/rooms/rooms.routes.js';
import instrumentsRoutes from './features/instruments/instruments.routes.js';
import instrumentRentalsRoutes from './features/instrument-rentals/instrument-rentals.routes.js';
import enrollmentPackagesRoutes from './features/enrollment-packages/enrollment-packages.routes.js';
import courses from './features/courses/courses.routes.js';
import settingsRoutes from './features/settings/settings.routes.js';
import studentsRoutes from './features/students/students.routes.js';
import reportsRoutes from './features/reports/reports.routes.js';
import billingPaymentsRoutes from './features/billing-payments/billing-payments.routes.js';
import profileRoutes from '../../features/profile/profile.routes.js';
import { listNotifications } from '../../features/notifications/notification.service.js';

import { coursesController } from './features/courses/courses.controller.js';

// Front Desk routes
import frontDeskInstructorRoutes from './features/instructors/instructor.routes.js';

//Client routes
import roomBookingsRoutes from './features/room-bookings/room-booking.routes.js';
import enrollmentRoutes from './features/enrollments/enrollment.routes.js';
import { requireAdminOrFrontDesk } from './features/auth/authorization.js';
import { listCadenzaAudit } from './features/audit/cadenza-audit.service.js';

const router = express.Router();

router.use('/auth', authRoutes);

router.use(cadenzaAuthenticate);

router.use('/staff', staffRoutes);
router.use('/rooms', roomsRoutes);
router.use('/instruments', instrumentsRoutes);
router.use('/instrument-rentals', instrumentRentalsRoutes);
router.use('/enrollment-packages', enrollmentPackagesRoutes);
router.use('/courses', courses);
router.use('/settings', settingsRoutes);
router.use('/students', studentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/billing/payments', billingPaymentsRoutes);
router.use('/users', profileRoutes);

router.get('/notifications', async (req, res, next) => {
  try {
    const result = await listNotifications({ userId: req.user.id, page: 1, limit: 100 });
    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    return next(error);
  }
});

router.get('/courses/:courseId/:filename', coursesController.getCourseFile);

//front desk routes
router.use('/instructors', frontDeskInstructorRoutes);

//client routes
router.use('/room-bookings', roomBookingsRoutes);
router.use('/enrollments', enrollmentRoutes);

router.get('/audit', requireAdminOrFrontDesk, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const result = await listCadenzaAudit({
      ...req.query,
      appId: req.cadenzaApp.id,
    });
    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    return next(error);
  }
});


export default router;
