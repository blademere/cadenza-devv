const { successResponse } = require('../../../common/responses/apiResponse')
const service = require('./professional.service')

const getProfile = async (req, res) => successResponse(res, 'Professional person profile retrieved successfully.', await service.getProfile({ userId: req.user.id }))
const updateProfile = async (req, res) => successResponse(res, 'Professional person profile saved successfully.', await service.updateProfile({ userId: req.user.id, ...req.validated.body }))
const apply = async (req, res) => successResponse(res, 'Professional verification application created successfully.', await service.applyForVerification({ userId: req.user.id, ...req.validated.body }), 201)
const getMine = async (req, res) => successResponse(res, 'Professional verification status retrieved successfully.', await service.getMine({ userId: req.user.id }))
const listPending = async (_req, res) => successResponse(res, 'Pending professional verifications retrieved successfully.', await service.listPending())
const listVerified = async (_req, res) => successResponse(res, 'Verified professionals retrieved successfully.', await service.listVerified())
const decide = async (req, res) => successResponse(res, 'Professional verification decision recorded successfully.', await service.decideVerification({ id: req.validated.params.id, actorId: req.user.id, ...req.validated.body }))

module.exports = { getProfile, updateProfile, apply, getMine, listPending, listVerified, decide }
