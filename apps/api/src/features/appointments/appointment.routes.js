const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const authorizeResource = require('../../platform/authorization/authorizeResource')
const { ownershipPolicy } = require('../../platform/authorization/access-control.policy')
const repository = require('./appointment.repository')
const { APPOINTMENT_MODULE, APPOINTMENT_ACTIONS } = require('./appointment.constants')
const { listTypesValidator, createTypeValidator, createScheduleValidator, createSlotValidator, generateSlotsValidator, listSlotsValidator, createAppointmentValidator, appointmentIdValidator } = require('./appointment.validation')
const controller = require('./appointment.controller')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'appointments', required: true })
const loadAppointment = (id) => repository.findAppointment(Number(id))
const authorizeOwnedAppointment = (action) => authorizeResource({
  resource: APPOINTMENT_MODULE,
  action,
  loadResource: loadAppointment,
  policy: ownershipPolicy,
  getOwnerId: (appointment) => appointment.userId,
})
const authorizeAppointmentResource = (action) => authorizeResource({
  resource: APPOINTMENT_MODULE,
  action,
  loadResource: loadAppointment,
})

router.get('/types', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ), validate(listTypesValidator), asyncHandler(controller.listTypesController))
router.post('/types', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE), requireIdempotency, validate(createTypeValidator), asyncHandler(controller.createTypeController))
router.post('/schedules', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE), requireIdempotency, validate(createScheduleValidator), asyncHandler(controller.createScheduleController))
router.post('/slots', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE), requireIdempotency, validate(createSlotValidator), asyncHandler(controller.createSlotController))
router.post('/slots/generate', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE), requireIdempotency, validate(generateSlotsValidator), asyncHandler(controller.generateSlotsController))
router.get('/slots', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ), validate(listSlotsValidator), asyncHandler(controller.listSlotsController))
router.get('/mine', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ), asyncHandler(controller.listMyAppointmentsController))
router.post('/', authenticate, authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.CREATE), requireIdempotency, validate(createAppointmentValidator), asyncHandler(controller.createAppointmentController))
router.get('/:id', authenticate, authorizeOwnedAppointment(APPOINTMENT_ACTIONS.READ), validate(appointmentIdValidator), asyncHandler(controller.getMyAppointmentController))
router.post('/:id/cancel', authenticate, authorizeOwnedAppointment(APPOINTMENT_ACTIONS.CANCEL), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.cancelAppointmentController))
router.post('/:id/check-in', authenticate, authorizeAppointmentResource(APPOINTMENT_ACTIONS.CHECK_IN), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.checkInAppointmentController))
router.post('/:id/no-show', authenticate, authorizeAppointmentResource(APPOINTMENT_ACTIONS.NO_SHOW), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.noShowAppointmentController))
router.post('/:id/complete', authenticate, authorizeAppointmentResource(APPOINTMENT_ACTIONS.MANAGE), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.completeAppointmentController))

module.exports = router
