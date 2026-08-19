const { successResponse } = require('../../../common/responses/apiResponse')
const service = require('./plan-permit.service')

const create = async (req, res) => successResponse(res, 'Permit application created successfully.', await service.createApplication({ userId: req.user.id, ...req.validated.body }), 201)
const get = async (req, res) => successResponse(res, 'Permit application retrieved successfully.', await service.getMine({ id: req.validated.params.id, userId: req.user.id }))
const list = async (req, res) => successResponse(res, 'Permit applications retrieved successfully.', await service.listMine({ userId: req.user.id }))
const submit = async (req, res) => successResponse(res, 'Permit application marked ready for submission.', await service.submit({ id: req.validated.params.id, userId: req.user.id }))
const bookAppointment = async (req, res) => successResponse(res, 'Hardcopy submission appointment booked successfully.', await service.bookSubmissionAppointment({ id: req.validated.params.id, userId: req.user.id, ...req.validated.body }), 201)

module.exports = { create, get, list, submit, bookAppointment }
