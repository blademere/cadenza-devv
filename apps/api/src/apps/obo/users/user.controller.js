import bcrypt from 'bcrypt'
import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import {
  normalizePagination,
  createOrderBy,
  pickFilters,
} from '../../../common/pagination/pagination.js'
import * as usersService from '../../../features/users/user.service.js'
import {
  addMembership,
  addMembershipRole,
  requireActiveMembership,
} from '../../../platform/applications/application.service.js'

const listUsers = async (req, res) => {
  const query = req.validated.query
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(
    query,
    ['createdAt', 'updatedAt', 'email', 'isActive'],
    'createdAt'
  )
  const result = await usersService.listUsers({
    appId: getApplicationId(req),
    pagination,
    filters: pickFilters(query, ['email', 'isActive']),
    orderBy,
  })

  return res.status(200).json({
    success: true,
    message: 'OBO users retrieved successfully.',
    ...result,
  })
}

const createUser = async (req, res) => {
  const appId = getApplicationId(req)
  const { email, password } = req.validated.body
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await usersService.createUser({ email, passwordHash })
  const membership = await addMembership({ userId: user.id, appId })

  return successResponse(res, 'OBO user created successfully.', { user, membership }, 201)
}

const assignUserRole = async (req, res) => {
  const appId = getApplicationId(req)
  const { userId } = req.validated.params
  const { roleId } = req.validated.body
  const membership = await requireActiveMembership({ userId, appId })
  const assignment = await addMembershipRole({
    membershipId: membership.id,
    roleId,
    appId,
  })

  return successResponse(res, 'OBO user role assigned successfully.', {
    userId,
    membershipId: membership.id,
    role: assignment,
  }, 200)
}

export {
  listUsers,
  createUser,
  assignUserRole,
}
