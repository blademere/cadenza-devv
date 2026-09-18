import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './rental.service.js'
const list=async(req,res)=>successResponse(res,'Cadenza rentals retrieved successfully.',await service.list({appId:getApplicationId(req)}))
const create=async(req,res)=>successResponse(res,'Cadenza rental created successfully.',await service.create({appId:getApplicationId(req),...req.validated.body}),201)
export {list,create}
