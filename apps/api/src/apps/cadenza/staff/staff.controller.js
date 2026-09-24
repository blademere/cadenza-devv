import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './staff.service.js'

const listController = async (req, res) =>
  successResponse(res, 'Cadenza staff retrieved successfully.', await service.list({ appId: getApplicationId(req) }))

const getController = async (req, res) =>
  successResponse(res, 'Cadenza staff member retrieved successfully.', await service.get({
    appId: getApplicationId(req),
    id: req.validated.params.id,
  }))

const createController = async (req, res) =>
  successResponse(res, 'Cadenza staff member created successfully.', await service.create({
    appId: getApplicationId(req),
    actorId: req.user.id,
    ...req.validated.body,
  }), 201)

const updateController = async (req, res) =>
  successResponse(res, 'Cadenza staff member updated successfully.', await service.update({
    appId: getApplicationId(req),
    actorId: req.user.id,
    id: req.validated.params.id,
    ...req.validated.body,
  }))

const listCandidatesController = async (req, res) => successResponse(res, 'Cadenza staff candidates retrieved successfully.', await service.listCandidates({ appId: getApplicationId(req) }))

export { listController, listCandidatesController, getController, createController, updateController }
