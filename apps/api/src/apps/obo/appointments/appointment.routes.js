import express from 'express'
import {
  asyncHandler,
  idempotency,
  validate,
} from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as repository from '../../../features/appointments/appointment.repository.js'
import * as controller from './appointment.controller.js'
import {
  listTypesValidator,
  createTypeValidator,
  createScheduleValidator,
  listSchedulesValidator,
  createSlotValidator,
  generateSlotsValidator,
  listSlotsValidator,
  listAppointmentsValidator,
  createAppointmentValidator,
  appointmentIdValidator,
} from './appointment.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({
  scope: 'obo-appointments',
  required: true,
})
const loadAppointment = (id, req) =>
  repository.findAppointment(id, req.security.app.id)
const authorizeAppointmentResource = (action) =>
  authorizeResource({
    resource: 'obo_appointments',
    action,
    loadResource: loadAppointment,
  })

router.get('/types', authenticate, authorize('obo_appointments', 'read'), validate(listTypesValidator), asyncHandler(controller.listTypes))
router.post('/types', authenticate, authorize('obo_appointments', 'manage'), requireIdempotency, validate(createTypeValidator), asyncHandler(controller.createType))
router.post('/schedules', authenticate, authorize('obo_appointments', 'manage'), requireIdempotency, validate(createScheduleValidator), asyncHandler(controller.createSchedule))
router.get('/schedules', authenticate, authorize('obo_appointments', 'read'), validate(listSchedulesValidator), asyncHandler(controller.listSchedules))
router.post('/slots', authenticate, authorize('obo_appointments', 'manage'), requireIdempotency, validate(createSlotValidator), asyncHandler(controller.createSlot))
router.post('/slots/generate', authenticate, authorize('obo_appointments', 'manage'), requireIdempotency, validate(generateSlotsValidator), asyncHandler(controller.generate))
router.get('/slots', authenticate, authorize('obo_appointments', 'read'), validate(listSlotsValidator), asyncHandler(controller.listSlots))
router.get('/mine', authenticate, authorize('obo_appointments', 'read'), asyncHandler(controller.listMyAppointments))
router.get('/management', authenticate, authorize('obo_appointments', 'read'), validate(listAppointmentsValidator), asyncHandler(controller.listAppointments))
router.post('/management/:id/cancel', authenticate, authorizeAppointmentResource('cancel'), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.cancelManagedAppointment))
router.post('/', authenticate, authorize('obo_appointments', 'create'), requireIdempotency, validate(createAppointmentValidator), asyncHandler(controller.createAppointment))
router.get('/:id', authenticate, authorizeAppointmentResource('read'), validate(appointmentIdValidator), asyncHandler(controller.getMyAppointment))
router.post('/:id/cancel', authenticate, authorizeAppointmentResource('cancel'), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.cancelAppointment))
router.post('/:id/check-in', authenticate, authorizeAppointmentResource('check_in'), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.checkInAppointment))
router.post('/:id/no-show', authenticate, authorizeAppointmentResource('manage'), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.noShowAppointment))
router.post('/:id/complete', authenticate, authorizeAppointmentResource('manage'), requireIdempotency, validate(appointmentIdValidator), asyncHandler(controller.completeAppointment))

export default router
