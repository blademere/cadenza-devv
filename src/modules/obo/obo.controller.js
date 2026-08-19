const { successResponse } = require('../../common/responses/apiResponse')
const service = require('./obo.service')
const listPermitTypes = async (req, res) =>
  successResponse(
    res,
    'Permit types retrieved successfully.',
    await service.listPermitTypes()
  )
const createProfessional = async (req, res) =>
  successResponse(
    res,
    'Professional verification application created successfully.',
    await service.createProfessional({
      ...req.validated.body,
      userId: req.user.id,
    }),
    201
  )
const listPendingProfessionals = async (req, res) =>
  successResponse(
    res,
    'Pending professional verifications retrieved successfully.',
    await service.listPendingProfessionals()
  )
const verifyProfessional = async (req, res) =>
  successResponse(
    res,
    'Professional verification decision recorded successfully.',
    await service.verifyProfessional({
      id: req.validated.params.id,
      actorId: req.user.id,
      ...req.validated.body,
    })
  )
const createApplication = async (req, res) =>
  successResponse(
    res,
    'Permit application created successfully.',
    await service.createApplication({
      ...req.validated.body,
      userId: req.user.id,
    }),
    201
  )
const getApplication = async (req, res) =>
  successResponse(
    res,
    'Permit application retrieved successfully.',
    await service.getApplication({
      id: req.validated.params.id,
      userId: req.user.id,
    })
  )
const listMine = async (req, res) =>
  successResponse(
    res,
    'Permit applications retrieved successfully.',
    await service.listMine({ userId: req.user.id })
  )
const listReceivingApplications = async (req, res) =>
  successResponse(
    res,
    'Applications awaiting receiving review retrieved successfully.',
    await service.listReceivingApplications(req.validated.query)
  )
const submitApplication = async (req, res) =>
  successResponse(
    res,
    'Permit application marked ready for submission.',
    await service.submitApplication({
      id: req.validated.params.id,
      userId: req.user.id,
    })
  )
const bookSubmissionAppointment = async (req, res) =>
  successResponse(
    res,
    'Hardcopy submission appointment booked successfully.',
    await service.bookSubmissionAppointment({
      id: req.validated.params.id,
      userId: req.user.id,
      ...req.validated.body,
    }),
    201
  )
const receiveApplication = async (req, res) =>
  successResponse(
    res,
    `Permit application ${req.validated.body.decision.toLowerCase()} successfully.`,
    await service.receiveApplication({
      id: req.validated.params.id,
      actorId: req.user.id,
      ...req.validated.body,
    })
  )
module.exports = {
  listPermitTypes,
  createProfessional,
  listPendingProfessionals,
  verifyProfessional,
  createApplication,
  getApplication,
  listMine,
  listReceivingApplications,
  submitApplication,
  bookSubmissionAppointment,
  receiveApplication,
}
