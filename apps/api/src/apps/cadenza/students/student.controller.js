import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './student.service.js'
const list=async(req,res)=>successResponse(res,'Cadenza students retrieved successfully.',await service.list({appId:getApplicationId(req)}))
const create=async(req,res)=>successResponse(res,'Cadenza student created successfully.',await service.create({appId:getApplicationId(req),...req.validated.body}),201)
const get=async(req,res)=>successResponse(res,'Cadenza student retrieved successfully.',await service.get({appId:getApplicationId(req),id:req.validated.params.id}))
export {list,create,get}
