import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './client.service.js'

const createProfile = async (req, res) =>
  successResponse(res, 'OBO client profile created successfully.', await service.createProfile({ userId: req.user.id, ...req.validated.body }), 201)

const getProfile = async (req, res) =>
  successResponse(res, 'OBO client profile retrieved successfully.', await service.getProfile({ userId: req.user.id }))

const updateProfile = async (req, res) =>
  successResponse(res, 'OBO client profile updated successfully.', await service.updateProfile({ userId: req.user.id, ...req.validated.body }))

export { createProfile, getProfile, updateProfile }
