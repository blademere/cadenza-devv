import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from '../../../features/appointments/appointment.service.js'
import { mapAppointmentType, mapAppointment, mapAppointmentSlot, mapAvailabilitySchedule } from '../../../features/appointments/appointment.mapper.js'

const mapList = (items, mapper) => items.map(mapper)

const listTypes = async (req, res) => successResponse(res, 'Appointment types retrieved successfully.', mapList(await service.listAppointmentTypes({ ...req.validated.query, appId: getApplicationId(req) }), mapAppointmentType))
const createType = async (req, res) => successResponse(res, 'Appointment type created successfully.', mapAppointmentType(await service.createAppointmentType({ actorId: req.user.id, appId: getApplicationId(req), data: req.validated.body })), 201)
const createSchedule = async (req, res) => successResponse(res, 'Availability schedule created successfully.', mapAvailabilitySchedule(await service.createAvailabilitySchedule({ actorId: req.user.id, appId: getApplicationId(req), data: req.validated.body })), 201)
const listSchedules = async (req, res) => successResponse(res, 'Availability schedules retrieved successfully.', mapList(await service.listAvailabilitySchedules({ ...req.validated.query, appId: getApplicationId(req) }), mapAvailabilitySchedule))
const createSlot = async (req, res) => successResponse(res, 'Appointment slot created successfully.', mapAppointmentSlot(await service.createAppointmentSlot({ actorId: req.user.id, appId: getApplicationId(req), data: req.validated.body })), 201)
const generate = async (req, res) => successResponse(res, 'Appointment slots generated successfully.', mapList(await service.generateSlots({ ...req.validated.body, actorId: req.user.id, appId: getApplicationId(req) }), mapAppointmentSlot), 201)
const listSlots = async (req, res) => successResponse(res, 'Appointment slots retrieved successfully.', mapList(await service.listAppointmentSlots({ ...req.validated.query, appId: getApplicationId(req) }), mapAppointmentSlot))
const createAppointment = async (req, res) => successResponse(res, 'Appointment booked successfully.', mapAppointment(await service.bookAppointment({ userId: req.user.id, appId: getApplicationId(req), ...req.validated.body })), 201)
const listAppointments = async (req, res) => successResponse(res, 'Appointments retrieved successfully.', mapList(await service.listAppointments({ ...req.validated.query, appId: getApplicationId(req) }), mapAppointment))
const listMyAppointments = async (req, res) => successResponse(res, 'Appointments retrieved successfully.', mapList(await service.listMyAppointments({ userId: req.user.id, appId: getApplicationId(req) }), mapAppointment))
const getMyAppointment = async (req, res) => successResponse(res, 'Appointment retrieved successfully.', mapAppointment(await service.getMyAppointment({ id: req.validated.params.id, userId: req.user.id, appId: getApplicationId(req) })))
const cancelAppointment = async (req, res) => successResponse(res, 'Appointment cancelled successfully.', mapAppointment(await service.cancelAppointment({ id: req.validated.params.id, userId: req.user.id, appId: getApplicationId(req) })))
const cancelManagedAppointment = async (req, res) => successResponse(res, 'Appointment cancelled successfully.', mapAppointment(await service.cancelManagedAppointment({ id: req.validated.params.id, actorId: req.user.id, appId: getApplicationId(req) })))
const checkInAppointment = async (req, res) => successResponse(res, 'Appointment checked in successfully.', mapAppointment(await service.checkInAppointment({ id: req.validated.params.id, actorId: req.user.id, appId: getApplicationId(req) })))
const completeAppointment = async (req, res) => successResponse(res, 'Appointment completed successfully.', mapAppointment(await service.completeAppointment({ id: req.validated.params.id, actorId: req.user.id, appId: getApplicationId(req) })))
const noShowAppointment = async (req, res) => successResponse(res, 'Appointment marked as no-show successfully.', mapAppointment(await service.markNoShow({ id: req.validated.params.id, actorId: req.user.id, appId: getApplicationId(req) })))

export { listTypes, createType, createSchedule, listSchedules, createSlot, generate, listSlots, createAppointment, listAppointments, listMyAppointments, getMyAppointment, cancelAppointment, cancelManagedAppointment, checkInAppointment, completeAppointment, noShowAppointment }
