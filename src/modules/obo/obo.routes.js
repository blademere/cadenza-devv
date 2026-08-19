const express = require('express')
const permitTypeRoutes = require('./permit-types/permit-type.routes')
const professionalRoutes = require('./professionals/professional.routes')
const planPermitRoutes = require('./plan-permits/plan-permit.routes')
const receivingRoutes = require('./receiving/receiving.routes')
const submissionAppointmentRoutes = require('./submission-appointments')

const router = express.Router()

router.use('/permit-types', permitTypeRoutes)
router.use('/professionals', professionalRoutes)
router.use('/applications/:applicationId/submission-appointments', submissionAppointmentRoutes)
router.use('/applications', planPermitRoutes)
router.use('/receiving', receivingRoutes)

module.exports = router
