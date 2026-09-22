import {successResponse} from '../../../common/responses/apiResponse.js'
import {getApplicationId} from '../../../platform/applications/application-context.middleware.js'
import * as service from './rental.service.js'
const customers=async(req,res)=>successResponse(res,'Cadenza rental customers retrieved successfully.',await service.customers({appId:getApplicationId(req)}))
const availability=async(req,res)=>successResponse(res,'Cadenza rental availability retrieved successfully.',await service.availability({appId:getApplicationId(req),...req.validated.query}))
const list=async(req,res)=>successResponse(res,'Cadenza rentals retrieved successfully.',await service.list({appId:getApplicationId(req),actorId:req.user?.id}))
const create=async(req,res)=>successResponse(res,'Cadenza rental created successfully.',await service.create({appId:getApplicationId(req),...req.validated.body,actorId:req.user?.id}),201)
const checkout=async(req,res)=>successResponse(res,'Cadenza rental checked out successfully.',await service.checkout({appId:getApplicationId(req),id:req.params.id,actorId:req.user?.id}))
const returnRental=async(req,res)=>successResponse(res,'Cadenza rental returned successfully.',await service.returnRental({appId:getApplicationId(req),id:req.params.id,actorId:req.user?.id}))
const cancel=async(req,res)=>successResponse(res,'Cadenza rental cancelled successfully.',await service.cancel({appId:getApplicationId(req),id:req.params.id,actorId:req.user?.id}))
export {list,customers,availability,create,checkout,returnRental,cancel}
