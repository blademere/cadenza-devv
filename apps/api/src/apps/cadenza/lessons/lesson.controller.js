import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './lesson.service.js'
const listPackages=async(req,res)=>successResponse(res,'Cadenza lesson packages retrieved successfully.',await service.listPackages({appId:getApplicationId(req)}))
const createPackage=async(req,res)=>successResponse(res,'Cadenza lesson package created successfully.',await service.createPackage({appId:getApplicationId(req),...req.validated.body}),201)
const listEnrollments=async(req,res)=>successResponse(res,'Cadenza enrollments retrieved successfully.',await service.listEnrollments({appId:getApplicationId(req)}))
const enroll=async(req,res)=>successResponse(res,'Cadenza enrollment created successfully.',await service.enroll({appId:getApplicationId(req),...req.validated.body}),201)
const listSessions=async(req,res)=>successResponse(res,'Cadenza lesson sessions retrieved successfully.',await service.listSessions({appId:getApplicationId(req)}))
const createSession=async(req,res)=>successResponse(res,'Cadenza lesson session scheduled successfully.',await service.createSession({appId:getApplicationId(req),...req.validated.body}),201)
const markAttendance=async(req,res)=>successResponse(res,'Cadenza attendance saved successfully.',await service.markAttendance({appId:getApplicationId(req),sessionId:req.params.sessionId,...req.validated.body}))
const requestReschedule=async(req,res)=>successResponse(res,'Cadenza reschedule requested successfully.',await service.requestReschedule({appId:getApplicationId(req),...req.validated.body}),201)
const reviewReschedule=async(req,res)=>successResponse(res,'Cadenza reschedule reviewed successfully.',await service.reviewReschedule({appId:getApplicationId(req),id:req.params.id,...req.validated.body}))
export {listPackages,createPackage,listEnrollments,enroll,listSessions,createSession,markAttendance,requestReschedule,reviewReschedule}
