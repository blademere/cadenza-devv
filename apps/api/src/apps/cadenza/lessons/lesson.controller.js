import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './lesson.service.js'
const listPackages=async(req,res)=>successResponse(res,'Cadenza lesson packages retrieved successfully.',await service.listPackages({appId:getApplicationId(req)}))
const createPackage=async(req,res)=>successResponse(res,'Cadenza lesson package created successfully.',await service.createPackage({appId:getApplicationId(req),...req.validated.body}),201)
const listEnrollments=async(req,res)=>successResponse(res,'Cadenza enrollments retrieved successfully.',await service.listEnrollments({appId:getApplicationId(req)}))
const enroll=async(req,res)=>successResponse(res,'Cadenza enrollment created successfully.',await service.enroll({appId:getApplicationId(req),...req.validated.body}),201)
export {listPackages,createPackage,listEnrollments,enroll}
