import { successResponse } from '../../../../common/responses/apiResponse.js';

import { getApplicationId } from '../../../../platform/applications/application-context.middleware.js';

import * as service from './rooms.service.js';

const list = async (req, res) =>
  successResponse(
    res,
    'Cadenza web rooms retrieved successfully.',
    await service.list({
      appId: getApplicationId(req),
    }),
  );

const get = async (req, res) =>
  successResponse(
    res,
    'Cadenza web room retrieved successfully.',
    await service.get({
      appId: getApplicationId(req),
      id: req.validated.params.id,
    }),
  );

const create = async (req, res) =>
  successResponse(
    res,
    'Cadenza web room created successfully.',
    await service.create({
      appId: getApplicationId(req),
      ...req.validated.body,
    }),
    201,
  );

const update = async (req, res) =>
  successResponse(
    res,
    'Cadenza web room updated successfully.',
    await service.update({
      appId: getApplicationId(req),
      id: req.validated.params.id,
      ...req.validated.body,
    }),
  );

export { list, get, create, update };
