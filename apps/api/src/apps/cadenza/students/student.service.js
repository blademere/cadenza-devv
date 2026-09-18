import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './student.repository.js'
const text=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new BadRequestError(n+' is required.');return v.trim()}
const create=async({appId,userId,personId,firstName,lastName,email,phone})=>{const app=requireAppId(appId);if(!Number.isInteger(Number(userId))||Number(userId)<=0)throw new BadRequestError('userId is required.');try{return await repository.create({appId:app,userId:Number(userId),personId:personId||null,firstName:text(firstName,'firstName'),lastName:text(lastName,'lastName'),email:email?text(email,'email'):null,phone:phone?text(phone,'phone'):null})}catch(e){if(e?.code==='P2002')throw new ConflictError('Student already exists for this application.');throw e}}
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Student not found.');return value}
const list=({appId})=>repository.list(requireAppId(appId))
export {create,get,list}
