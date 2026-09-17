import bcrypt from 'bcrypt'
import { successResponse } from '../../../common/responses/apiResponse.js'
import {
  normalizePagination,
  createOrderBy,
  pickFilters,
  createPaginationMeta,
} from '../../../common/pagination/pagination.js'
import * as usersService from '../../../features/users/user.service.js'
import { toUserResponse } from '../../../features/users/user.mapper.js'
import { findAllOBOUsers } from './user.repository.js'
import {
  addMembership,
  addMembershipRole,
  requireActiveMembership,
} from '../../../platform/applications/application.service.js'

const getAppId = (req) => req.security.app.id

const listUsers = async (req, res) => {
  const query = req.validated.query
  const pagination = normalizePagination(query)
  const orderBy = createOrderBy(
    query,
    ['createdAt', 'updatedAt', 'email', 'isActive'],
    'createdAt'
  )
  const { users, total } = await findAllOBOUsers({
    appId: getAppId(req),
    skip: pagination.skip,
    take: pagination.take,
    filters: pickFilters(query, ['email', 'isActive']),
    orderBy,
  })

  return res.status(200).json({
    success: true,
    message: 'OBO users retrieved successfully.',
    data: users.map(toUserResponse),
    pagination: createPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  })
}

const createUser = async (req, res) => {
  const appId = getAppId(req)
  const { email, password } = req.validated.body
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await usersService.createUser({ email, passwordHash })
  const membership = await addMembership({ userId: user.id, appId })

  return successResponse(res, 'OBO user created successfully.', { user, membership }, 201)
}

const assignUserRole = async (req, res) => {
  const appId = getAppId(req)
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
