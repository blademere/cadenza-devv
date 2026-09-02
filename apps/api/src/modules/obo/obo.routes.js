import express from 'express'
import permitTypeRoutes from './permit-types/permit-type.routes.js'
import clientRoutes from './clients/client.routes.js'
import professionalRoutes from './professionals/professional.routes.js'
import planPermitRoutes from './plan-permits/plan-permit.routes.js'
import receivingRoutes from './receiving/receiving.routes.js'
import submissionAppointmentRoutes from './submission-appointments/submission-appointment.routes.js'

const router = express.Router()

router.use('/permit-types', permitTypeRoutes)
router.use('/clients', clientRoutes)
router.use('/professionals', professionalRoutes)
router.use('/applications/:applicationId/submission-appointments', submissionAppointmentRoutes)
router.use('/applications', planPermitRoutes)
router.use('/receiving', receivingRoutes)

export default router
