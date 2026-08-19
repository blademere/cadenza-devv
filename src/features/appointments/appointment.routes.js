const express = require('express')
const { asyncHandler, validate } = require('../../common/middleware')
const authenticate = require('../auth/authenticate')
const authorize = require('../../platform/authorization/authorize')
const {
  APPOINTMENT_MODULE,
  APPOINTMENT_ACTIONS,
} = require('./appointment.constants')
const {
  listTypesValidator,
  createTypeValidator,
  createScheduleValidator,
  createSlotValidator,
  generateSlotsValidator,
  listSlotsValidator,
  createAppointmentValidator,
  appointmentIdValidator,
} = require('./appointment.validation')
const controller = require('./appointment.controller')

const router = express.Router()

router.get(
  '/types',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ),
  validate(listTypesValidator),
  asyncHandler(controller.listTypesController)
)
router.post(
  '/types',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE),
  validate(createTypeValidator),
  asyncHandler(controller.createTypeController)
)
router.post(
  '/schedules',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE),
  validate(createScheduleValidator),
  asyncHandler(controller.createScheduleController)
)
router.post(
  '/slots',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE),
  validate(createSlotValidator),
  asyncHandler(controller.createSlotController)
)
router.post(
  '/slots/generate',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE),
  validate(generateSlotsValidator),
  asyncHandler(controller.generateSlotsController)
)
router.get(
  '/slots',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ),
  validate(listSlotsValidator),
  asyncHandler(controller.listSlotsController)
)
router.get(
  '/mine',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ),
  asyncHandler(controller.listMyAppointmentsController)
)
router.post(
  '/',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.CREATE),
  validate(createAppointmentValidator),
  asyncHandler(controller.createAppointmentController)
)
router.get(
  '/:id',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.READ),
  validate(appointmentIdValidator),
  asyncHandler(controller.getMyAppointmentController)
)
router.post(
  '/:id/cancel',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.CANCEL),
  validate(appointmentIdValidator),
  asyncHandler(controller.cancelAppointmentController)
)
router.post(
  '/:id/check-in',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.CHECK_IN),
  validate(appointmentIdValidator),
  asyncHandler(controller.checkInAppointmentController)
)
router.post(
  '/:id/no-show',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.NO_SHOW),
  validate(appointmentIdValidator),
  asyncHandler(controller.noShowAppointmentController)
)
router.post(
  '/:id/complete',
  authenticate,
  authorize(APPOINTMENT_MODULE, APPOINTMENT_ACTIONS.MANAGE),
  validate(appointmentIdValidator),
  asyncHandler(controller.completeAppointmentController)
)

module.exports = router
