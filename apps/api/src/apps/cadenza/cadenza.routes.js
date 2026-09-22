import express from 'express'
import authenticate from '../../features/auth/authenticate.secure.js'
import { requireApplicationContext } from '../../platform/applications/application-context.middleware.js'
import authorizationRoutes from './authorization/authorization.routes.js'
import studentRoutes from './students/student.routes.js'
import instructorRoutes from './instructors/instructor.routes.js'
import instrumentRoutes from './instruments/instrument.routes.js'
import roomRoutes from './rooms/room.routes.js'
import lessonRoutes from './lessons/lesson.routes.js'
import rentalRoutes from './rentals/rental.routes.js'
import paymentRoutes from './payments/payment.routes.js'
import dashboardRoutes from './dashboard/dashboard.routes.js'
import resourceRoutes from './resources/resource.routes.js'
import { registerPaymentWorkflow } from '../../platform/payments/payment-workflow.registry.js'
import * as cadenzaPaymentWorkflow from './payments/payment-workflow.js'

registerPaymentWorkflow('cadenza', cadenzaPaymentWorkflow)

const router = express.Router()
router.use(authenticate, requireApplicationContext({ appKey: 'cadenza' }))
router.use('/dashboard', dashboardRoutes)
router.use('/authorization', authorizationRoutes)
router.use('/students', studentRoutes)
router.use('/instructors', instructorRoutes)
router.use('/instruments', instrumentRoutes)
router.use('/rooms', roomRoutes)
router.use('/lessons', lessonRoutes)
router.use('/rentals', rentalRoutes)
router.use('/payments', paymentRoutes)
router.use('/resources', resourceRoutes)
export default router
