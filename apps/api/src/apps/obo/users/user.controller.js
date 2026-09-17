import { successResponse } from '../../../common/responses/apiResponse.js'
import {
  normalizePagination,
  createOrderBy,
  pickFilters,
} from '../../../common/pagination/pagination.js'
import * as service from './user.service.js'

const getAppId = (req) => req.security.app.id

const listUsers = async (req, res) => {
  const query = req.validated.query
  const result = await service.listUsers({
    appId: getAppId(req),
    filters: pickFilters(query, ['email', 'isActive']),
    pagination: normalizePagination(query),
    orderBy: createOrderBy(
      query,
      ['createdAt', 'updatedAt', 'email', 'isActive'],
      'createdAt'
    ),
  })

  return res.status(200).json({
    success: true,
    message: 'OBO users retrieved successfully.',
    data: result.data,
    pagination: result.pagination,
  })
}

const createUser = async (req, res) => {
  const result = await service.createUser({
    appId: getAppId(req),
    ...req.validated.body,
  })

  return successResponse(res, 'OBO user created successfully.', result, 201)
}

const assignUserRole = async (req, res) => {
  const result = await service.assignUserRole({
    appId: getAppId(req),
    userId: req.validated.params.userId,
    roleId: req.validated.body.roleId,
  })

  return successResponse(res, 'OBO user role assigned successfully.', result, 200)
}

export {
  listUsers,
  createUser,
  assignUserRole,
}
