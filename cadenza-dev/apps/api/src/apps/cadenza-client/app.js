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

import { coursesController } from './features/courses/courses.controller.js';

// Front Desk routes
import frontDeskInstructorRoutes from './features/cadenza-instructors/instructor.routes.js';

//Client routes
import roomBookingsRoutes from './features/room-bookings/room-booking.routes.js';
import enrollmentRoutes from './features/enrollments/enrollment.routes.js';

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

router.get('/courses/:courseId/:filename', coursesController.getCourseFile);

//front desk routes
router.use('/instructors', frontDeskInstructorRoutes);

//client routes
router.use('/room-bookings', roomBookingsRoutes);
router.use('/enrollments', enrollmentRoutes);


export default router;
