import express from 'express';

import cadenzaAuthenticate from '../cadenza-client/features/auth/authenticate.js';
import authRoutes from './features/auth/auth.routes.js';
import enrollmentRoutes from '../cadenza-client/features/enrollments/enrollment.routes.js';
import roomBookingsRoutes from '../cadenza-client/features/room-bookings/room-booking.routes.js';
import instrumentRentalsRoutes from '../cadenza-client/features/instrument-rentals/instrument-rentals.routes.js';
import requireActiveEnrollment from './middleware/require-active-enrollment.js';
import studentRoutes from './features/student/student.routes.js';
import instructorRoutes from './features/instructor/instructor.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);

router.use(cadenzaAuthenticate);
router.use(requireActiveEnrollment);

router.use('/student', studentRoutes);
router.use('/instructor', instructorRoutes);

router.use('/enrollments', enrollmentRoutes);
router.use('/room-bookings', roomBookingsRoutes);
router.use('/instrument-rentals', instrumentRentalsRoutes);

export default router;
