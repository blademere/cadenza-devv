import express from 'express'
import authenticate from '../../features/auth/authenticate.secure.js'
import { requireApplicationContext } from '../../platform/applications/application-context.middleware.js'
import permitTypeRoutes from './permit-types/permit-type.routes.js'
import clientRoutes from './clients/client.routes.js'
import professionalRoutes from './professionals/professional.routes.js'
import planPermitRoutes from './applications/applications.routes.js'
import receivingRoutes from './receiving/receiving.routes.js'
import submissionAppointmentRoutes from './submission-appointments/submission-appointment.routes.js'
import appointmentRoutes from './appointments/appointment.routes.js'
import authorizationRoutes from './authorization/authorization.routes.js'
import userRoutes from './users/user.routes.js'

const oboRouter = express.Router()

oboRouter.use(authenticate, requireApplicationContext({ appKey: 'obo' }))
oboRouter.use('/authorization', authorizationRoutes)
oboRouter.use('/users', userRoutes)
oboRouter.use('/permit-types', permitTypeRoutes)
oboRouter.use('/clients', clientRoutes)
oboRouter.use('/professionals', professionalRoutes)
oboRouter.use('/appointments', appointmentRoutes)
oboRouter.use('/applications/:applicationId/submission-appointments', submissionAppointmentRoutes)
oboRouter.use('/applications', planPermitRoutes)
oboRouter.use('/receiving', receivingRoutes)

export default oboRouter
