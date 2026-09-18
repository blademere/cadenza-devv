import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './applications.service.js'

const create = async (req, res) => successResponse(res, 'Permit application created successfully.', await service.createApplication({ appId: getApplicationId(req), userId: req.user.id, ...req.validated.body }), 201)
const get = async (req, res) => successResponse(res, 'Permit application retrieved successfully.', await service.getMine({ id: req.params.id, appId: getApplicationId(req), userId: req.user.id }))
const list = async (req, res) => successResponse(res, 'Permit applications retrieved successfully.', await service.listMine({ appId: getApplicationId(req), userId: req.user.id }))
const update = async (req, res) => successResponse(res, 'Permit application updated successfully.', await service.updateDraft({ id: req.params.id, appId: getApplicationId(req), userId: req.user.id, ...req.validated.body }))
const submit = async (req, res) => successResponse(res, 'Permit application marked ready for submission.', await service.submit({ id: req.params.id, appId: getApplicationId(req), userId: req.user.id }))

export { create, get, list, update, submit }
