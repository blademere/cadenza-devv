import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './instructor.service.js'
const listMySchedule=async(req,res)=>successResponse(res,'Cadenza instructor schedule retrieved successfully.',await service.listMySchedule({appId:getApplicationId(req),actorId:req.user?.id}))
const list=async(req,res)=>successResponse(res,'Cadenza instructors retrieved successfully.',await service.list({appId:getApplicationId(req)}))
const listCandidates=async(req,res)=>successResponse(res,'Cadenza instructor candidates retrieved successfully.',await service.listCandidates({appId:getApplicationId(req)}))
const get=async(req,res)=>successResponse(res,'Cadenza instructor retrieved successfully.',await service.get({appId:getApplicationId(req),id:req.validated.params.id}))
const create=async(req,res)=>successResponse(res,'Cadenza instructor created successfully.',await service.create({appId:getApplicationId(req),actorId:req.user?.id,...req.validated.body}),201)
const update=async(req,res)=>successResponse(res,'Cadenza instructor updated successfully.',await service.update({appId:getApplicationId(req),id:req.validated.params.id,...req.validated.body}))
export {list,listCandidates,get,create,update,listMySchedule}
