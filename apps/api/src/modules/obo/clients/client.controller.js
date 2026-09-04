import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './client.service.js'

const createMine = async (req, res) =>
  successResponse(res, 'OBO client profile created successfully.', await service.createMine({ userId: req.user.id, ...req.validated.body }), 201)

const getMine = async (req, res) =>
  successResponse(res, 'OBO client profile retrieved successfully.', await service.getMine({ userId: req.user.id }))

export { createMine, getMine }
