import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './instrument.service.js'
const list=async(req,res)=>successResponse(res,'Cadenza instruments retrieved successfully.',await service.list({appId:getApplicationId(req)}))
const get=async(req,res)=>successResponse(res,'Cadenza instrument retrieved successfully.',await service.get({appId:getApplicationId(req),id:req.validated.params.id}))
const create=async(req,res)=>successResponse(res,'Cadenza instrument created successfully.',await service.create({appId:getApplicationId(req),...req.validated.body}),201)
export {list,get,create}
