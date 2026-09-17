import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './professional.service.js'

const appId = (req) => req.security?.app?.id

const getProfile = async (req, res) => successResponse(res, 'Professional person profile retrieved successfully.', await service.getProfile({ userId: req.user.id }))
const createProfile = async (req, res) => successResponse(res, 'Professional person profile created successfully.', await service.createProfile({ userId: req.user.id, ...req.validated.body }), 201)
const updateProfile = async (req, res) => successResponse(res, 'Professional person profile updated successfully.', await service.updateProfile({ userId: req.user.id, ...req.validated.body }))
const apply = async (req, res) => successResponse(res, 'Professional application created successfully.', await service.applyForVerification({ appId: appId(req), userId: req.user.id, ...req.validated.body }), 201)
const getMine = async (req, res) => successResponse(res, 'Professional application retrieved successfully.', await service.getMine({ appId: appId(req), userId: req.user.id }))
const listDirectory = async (req, res) => successResponse(res, 'Professionals retrieved successfully.', await service.listDirectory({ appId: appId(req), ...req.validated.query }))
const listPending = async (req, res) => successResponse(res, 'Pending professional applications retrieved successfully.', await service.listPending(appId(req)))
const listVerified = async (req, res) => successResponse(res, 'Verified professional applications retrieved successfully.', await service.listVerified(appId(req)))
const decide = async (req, res) => successResponse(res, 'Professional application decision recorded successfully.', await service.decideVerification({ id: req.params.id, appId: appId(req), actorId: req.user.id, ...req.validated.body }))

export { getProfile, createProfile, updateProfile, apply, getMine, listDirectory, listPending, listVerified, decide }
