import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import authorizeResource from '../../platform/authorization/authorizeResource.js'
import { ownershipPolicy } from '../../platform/authorization/access-control.policy.js'
import * as repository from './appointment.repository.js'
import { APPOINTMENT_MODULE, APPOINTMENT_ACTIONS } from './appointment.constants.js'
import { listTypesValidator, createTypeValidator, createScheduleValidator, createSlotValidator, generateSlotsValidator, listSlotsValidator, createAppointmentValidator, appointmentIdValidator } from './appointment.validation.js'
import controller from './appointment.controller.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'appointments', required: true })
const loadAppointment = (id) => repository.findAppointment(Number(id))
const authorizeOwnedAppointment = (action) => authorizeResource({ resource: APPOINTMENT_MODULE, action, loadResource: loadAppointment, policy: ownershipPolicy, getOwnerId: (appointment) => appointment.userId })
const authorizeAppointmentResource = (action) => authorizeResource({ resource: APPOINTMENT_MODULE, action, loadResource: loadAppointment })

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

export default router
