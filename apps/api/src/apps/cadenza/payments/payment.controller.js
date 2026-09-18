import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './payment.service.js'
const get=async(req,res)=>successResponse(res,'Cadenza payment obligation retrieved successfully.',await service.get({appId:getApplicationId(req),obligationId:req.validated.params.obligationId}))
const checkout=async(req,res)=>successResponse(res,'Cadenza payment checkout created successfully.',await service.checkout({appId:getApplicationId(req),...req.validated.params,...req.validated.body,idempotencyKey:req.get('Idempotency-Key')}),201)
const pay=async(req,res)=>successResponse(res,'Cadenza payment recorded successfully.',await service.pay({appId:getApplicationId(req),actorId:req.user?.id,...req.validated.params,...req.validated.body,idempotencyKey:req.get('Idempotency-Key')}),201)
export {get,pay,checkout}
