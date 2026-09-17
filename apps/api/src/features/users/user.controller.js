import bcrypt from 'bcrypt'
import { successResponse } from '../../common/responses/apiResponse.js'
import {
  listUsers,
  createUser,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
} from './user.service.js'
import {
  normalizePagination,
  createOrderBy,
  pickFilters,
} from '../../common/pagination/pagination.js'

const getAppId = (req) => req.auth?.appId ?? req.appContext?.id ?? null

const listUsersController = async (req, res) => {
  const query = req.validated.query
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(query, ['createdAt', 'updatedAt', 'email', 'isActive'], 'createdAt')
  const filters = pickFilters(query, ['email', 'isActive'])
  const result = await listUsers({
    appId: getAppId(req),
    filters,
    pagination,
    orderBy,
  })
  return res.status(200).json({ success: true, message: 'Users retrieved successfully.', data: result.data, pagination: result.pagination })
}

const createUserController = async (req, res) => {
  const { email, password } = req.validated.body
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await createUser({ email, passwordHash })
  return successResponse(res, 'User created successfully.', user, 201)
}

const getMyProfileController = async (req, res) => successResponse(res, 'Profile retrieved successfully.', await getMyProfile(req.user.id, getAppId(req)))
const createMyProfileController = async (req, res) => successResponse(res, 'Profile created successfully.', await createMyProfile(req.user.id, req.validated.body, getAppId(req)), 201)
const updateMyProfileController = async (req, res) => successResponse(res, 'Profile updated successfully.', await updateMyProfile(req.user.id, req.validated.body, getAppId(req)), 200)

export {
  listUsersController,
  createUserController,
  getMyProfileController,
  createMyProfileController,
  updateMyProfileController,
}
