import { successResponse } from '../../common/responses/apiResponse.js'
import {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
} from './profile.service.js'

const getMyProfileController = async (req, res) =>
  successResponse(
    res,
    'Profile retrieved successfully.',
    await getMyProfile(req.user.id),
  )

const createMyProfileController = async (req, res) =>
  successResponse(
    res,
    'Profile created successfully.',
    await createMyProfile(req.user.id, req.validated.body),
    201,
  )

const updateMyProfileController = async (req, res) =>
  successResponse(
    res,
    'Profile updated successfully.',
    await updateMyProfile(req.user.id, req.validated.body),
    200,
  )

export {
  getMyProfileController,
  createMyProfileController,
  updateMyProfileController,
}
