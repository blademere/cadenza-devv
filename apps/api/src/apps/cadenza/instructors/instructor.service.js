import { BadRequestError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './instructor.repository.js'
const text=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new BadRequestError(n+' is required.');return v.trim()}
const list=({appId})=>repository.list(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Instructor not found.');return value}
const create=({appId,userId,personId,firstName,lastName,specialty})=>repository.create({appId:requireAppId(appId),userId:userId==null?null:Number(userId),personId:personId||null,firstName:text(firstName,'firstName'),lastName:text(lastName,'lastName'),specialty:specialty?text(specialty,'specialty'):null})
export {list,get,create}
