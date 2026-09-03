import express from 'express'
import permitTypeRoutes from './permit-types/permit-type.routes.js'
import clientRoutes from './clients/client.routes.js'
import professionalRoutes from './professionals/professional.routes.js'
import planPermitRoutes from './plan-permits/plan-permit.routes.js'
import receivingRoutes from './receiving/receiving.routes.js'
import submissionAppointmentRoutes from './submission-appointments/submission-appointment.routes.js'

const oboRouter = express.Router()

oboRouter.use('/permit-types', permitTypeRoutes)
oboRouter.use('/clients', clientRoutes)
oboRouter.use('/professionals', professionalRoutes)
oboRouter.use('/applications/:applicationId/submission-appointments', submissionAppointmentRoutes)
oboRouter.use('/applications', planPermitRoutes)
oboRouter.use('/receiving', receivingRoutes)

export default oboRouter
