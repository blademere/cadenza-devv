import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './plan-permit.service.js'

const appId = (req) => req.security?.app?.id

const create = async (req, res) => successResponse(res, 'Permit application created successfully.', await service.createApplication({ appId: appId(req), userId: req.user.id, ...req.validated.body }), 201)
const get = async (req, res) => successResponse(res, 'Permit application retrieved successfully.', await service.getMine({ id: req.params.id, appId: appId(req), userId: req.user.id }))
const list = async (req, res) => successResponse(res, 'Permit applications retrieved successfully.', await service.listMine({ appId: appId(req), userId: req.user.id }))
const update = async (req, res) => successResponse(res, 'Permit application updated successfully.', await service.updateDraft({ id: req.params.id, appId: appId(req), userId: req.user.id, ...req.validated.body }))
const submit = async (req, res) => successResponse(res, 'Permit application marked ready for submission.', await service.submit({ id: req.params.id, appId: appId(req), userId: req.user.id }))

export { create, get, list, update, submit }
