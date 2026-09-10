import { successResponse } from '../../common/responses/apiResponse.js'
import {
  listUsers,
  registerUser,
  assignUserRole,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
} from './user.service.js'

const listUsersController = async (req, res) => {
  const result = await listUsers(req.validated.query)
  return res.status(200).json({
    success: true,
    message: 'Users retrieved successfully.',
    data: result.data,
    pagination: result.pagination,
  })
}

const createUserController = async (req, res) => {
  const user = await registerUser({
    requesterId: req.user.id,
    ...req.validated.body,
  })
  return successResponse(res, 'User created successfully.', user, 201)
}

const assignUserRoleController = async (req, res) => {
  const user = await assignUserRole({
    requesterId: req.user.id,
    ...req.validated.params,
    ...req.validated.body,
  })
  return successResponse(res, 'User role updated successfully.', user)
}

const getMyProfileController = async (req, res) => {
  const profile = await getMyProfile(req.user.id)
  return successResponse(res, 'Profile retrieved successfully.', profile)
}

const createMyProfileController = async (req, res) => {
  const profile = await createMyProfile(req.user.id, req.validated.body)
  return successResponse(res, 'Profile created successfully.', profile, 201)
}

const updateMyProfileController = async (req, res) => {
  const profile = await updateMyProfile(req.user.id, req.validated.body)
  return successResponse(res, 'Profile updated successfully.', profile)
}

export {
  listUsersController,
  createUserController,
  assignUserRoleController,
  getMyProfileController,
  createMyProfileController,
  updateMyProfileController,
}
