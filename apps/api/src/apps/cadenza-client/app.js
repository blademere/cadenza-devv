import express from 'express'
import authenticate from '../../features/auth/authenticate.secure.js'
import { requireApplicationContext } from '../../platform/applications/application-context.middleware.js'
import staffRoutes from './features/staff/staff.routes.js'
import roomsRoutes from './features/rooms/rooms.routes.js'
import instrumentsRoutes from './features/instruments/instruments.routes.js'
import instrumentRentalsRoutes from './features/instrument-rentals/instrument-rentals.routes.js'
import enrollmentPackagesRoutes from './features/enrollment-packages/enrollment-packages.routes.js'
import coursesMaterialsRoutes from './features/courses-materials/courses-materials.routes.js'
import { coursesController } from './features/courses-materials/courses-materials.controller.js';


const router = express.Router()

router.use(authenticate, requireApplicationContext({ appKey: 'cadenza-client' }))
router.use('/staff', staffRoutes)
router.use('/rooms', roomsRoutes)
router.use('/instruments', instrumentsRoutes)
router.use('/instrument-rentals', instrumentRentalsRoutes)
router.use('/enrollment-packages', enrollmentPackagesRoutes)
router.use('/courses-materials', coursesMaterialsRoutes)
router.get(
  '/courses/:courseId/:filename',
  coursesController.getCourseFile,
);

export default router
    