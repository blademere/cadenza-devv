import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './professional.service.js'

const getProfile = async (req, res) => successResponse(res, 'Professional person profile retrieved successfully.', await service.getProfile({ userId: req.user.id }))
const createProfile = async (req, res) => successResponse(res, 'Professional person profile created successfully.', await service.createProfile({ userId: req.user.id, ...req.validated.body }), 201)
const updateProfile = async (req, res) => successResponse(res, 'Professional person profile updated successfully.', await service.updateProfile({ userId: req.user.id, ...req.validated.body }))
const apply = async (req, res) => successResponse(res, 'Professional application created successfully.', await service.applyForVerification({ appId: getApplicationId(req), userId: req.user.id, ...req.validated.body }), 201)
const getMine = async (req, res) => successResponse(res, 'Professional application retrieved successfully.', await service.getMine({ appId: getApplicationId(req), userId: req.user.id }))
const listDirectory = async (req, res) => successResponse(res, 'Professionals retrieved successfully.', await service.listDirectory({ appId: getApplicationId(req), ...req.validated.query }))
const listPending = async (req, res) => successResponse(res, 'Pending professional applications retrieved successfully.', await service.listPending(getApplicationId(req)))
const listVerified = async (req, res) => successResponse(res, 'Verified professional applications retrieved successfully.', await service.listVerified(getApplicationId(req)))
const decide = async (req, res) => successResponse(res, 'Professional application decision recorded successfully.', await service.decideVerification({ id: req.params.id, appId: getApplicationId(req), actorId: req.user.id, ...req.validated.body }))

export { getProfile, createProfile, updateProfile, apply, getMine, listDirectory, listPending, listVerified, decide }
