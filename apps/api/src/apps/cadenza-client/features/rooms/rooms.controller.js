import { successResponse } from '../../../../common/responses/apiResponse.js';

import * as service from './rooms.service.js';

const list = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client rooms retrieved successfully.',
    await service.list({
      appId: req.cadenzaApp.id,
    }),
  );

const get = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room retrieved successfully.',
    await service.get({
      appId: req.cadenzaApp.id,
      id: req.validated.params.id,
    }),
  );

const create = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room created successfully.',
    await service.create({
      appId: req.cadenzaApp.id,
      ...req.validated.body,
    }),
    201,
  );

const update = async (req, res) =>
  successResponse(
    res,
    'Cadenza Client room updated successfully.',
    await service.update({
      appId: req.cadenzaApp.id,
      id: req.validated.params.id,
      ...req.validated.body,
    }),
  );

export { list, get, create, update };
