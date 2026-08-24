const { successResponse } = require('../../common/responses/apiResponse')
const service = require('./appointment.service')
const { generateSlots } = require('./appointment.slot.service')
const {
  mapAppointmentType,
  mapAppointment,
  mapAppointmentSlot,
  mapAvailabilitySchedule,
} = require('./appointment.mapper')

const mapList = (items, mapper) => items.map(mapper)

const listTypesController = async (req, res) => successResponse(
  res,
  'Appointment types retrieved successfully.',
  mapList(await service.listAppointmentTypes(req.validated.query), mapAppointmentType)
)

const createTypeController = async (req, res) => successResponse(
  res,
  'Appointment type created successfully.',
  mapAppointmentType(await service.createAppointmentType({ actorId: req.user.id, data: req.validated.body })),
  201
)

const createScheduleController = async (req, res) => successResponse(
  res,
  'Availability schedule created successfully.',
  mapAvailabilitySchedule(await service.createAvailabilitySchedule({ actorId: req.user.id, data: req.validated.body })),
  201
)

const createSlotController = async (req, res) => successResponse(
  res,
  'Appointment slot created successfully.',
  mapAppointmentSlot(await service.createAppointmentSlot({ actorId: req.user.id, data: req.validated.body })),
  201
)

const generateSlotsController = async (req, res) => successResponse(
  res,
  'Appointment slots generated successfully.',
  mapList(await generateSlots({ ...req.validated.body, actorId: req.user.id }), mapAppointmentSlot),
  201
)

const listSlotsController = async (req, res) => successResponse(
  res,
  'Appointment slots retrieved successfully.',
  mapList(await service.listAppointmentSlots(req.validated.query), mapAppointmentSlot)
)

const createAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment booked successfully.',
  mapAppointment(await service.bookAppointment({ userId: req.user.id, ...req.validated.body })),
  201
)

const listMyAppointmentsController = async (req, res) => successResponse(
  res,
  'Appointments retrieved successfully.',
  mapList(await service.listMyAppointments({ userId: req.user.id }), mapAppointment)
)

const getMyAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment retrieved successfully.',
  mapAppointment(await service.getMyAppointment({ id: req.validated.params.id, userId: req.user.id }))
)

const cancelAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment cancelled successfully.',
  mapAppointment(await service.cancelAppointment({ id: req.validated.params.id, userId: req.user.id }))
)

const checkInAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment checked in successfully.',
  mapAppointment(await service.checkInAppointment({ id: req.validated.params.id, actorId: req.user.id }))
)

const completeAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment completed successfully.',
  mapAppointment(await service.completeAppointment({ id: req.validated.params.id, actorId: req.user.id }))
)

const noShowAppointmentController = async (req, res) => successResponse(
  res,
  'Appointment marked as no-show successfully.',
  mapAppointment(await service.markNoShow({ id: req.validated.params.id, actorId: req.user.id }))
)

module.exports = {
  listTypesController,
  createTypeController,
  createScheduleController,
  createSlotController,
  generateSlotsController,
  listSlotsController,
  createAppointmentController,
  listMyAppointmentsController,
  getMyAppointmentController,
  cancelAppointmentController,
  checkInAppointmentController,
  completeAppointmentController,
  noShowAppointmentController,
}
