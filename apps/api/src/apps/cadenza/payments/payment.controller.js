import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './payment.service.js'

const sync = async (req, res) => successResponse(res, 'Cadenza payment status synchronized successfully.', await service.sync({ actorId: req.user?.id, appId: getApplicationId(req), obligationId: req.validated.params.obligationId }))
const get = async (req, res) => successResponse(res, 'Cadenza payment obligation retrieved successfully.', await service.get({ actorId: req.user?.id, appId: getApplicationId(req), obligationId: req.validated.params.obligationId }))
const history = async (req, res) => successResponse(res, 'Cadenza payment history retrieved successfully.', await service.history({ actorId: req.user?.id, appId: getApplicationId(req), obligationId: req.validated.params.obligationId }))
const checkout = async (req, res) => successResponse(res, 'Cadenza payment checkout created successfully.', await service.checkout({ actorId: req.user?.id, appId: getApplicationId(req), ...req.validated.params, ...req.validated.body, idempotencyKey: req.get('Idempotency-Key') }), 201)
const pay = async (req, res) => successResponse(res, 'Cadenza payment recorded successfully.', await service.pay({ actorId: req.user?.id, appId: getApplicationId(req), ...req.validated.params, ...req.validated.body, idempotencyKey: req.get('Idempotency-Key') }), 201)
const refund = async (req, res) => successResponse(res, 'Cadenza payment refund recorded successfully.', await service.refund({ actorId: req.user?.id, appId: getApplicationId(req), ...req.validated.params, ...req.validated.body, idempotencyKey: req.get('Idempotency-Key') }), 201)
export { get, history, pay, checkout, sync, refund }