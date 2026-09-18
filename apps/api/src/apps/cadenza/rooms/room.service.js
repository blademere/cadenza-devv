import {positiveDecimal} from '../../../platform/money/money.js'
import {BadRequestError,ConflictError,NotFoundError} from '../../../common/errors/appError.js'
import {requireAppId} from '../../../platform/applications/application-scope.js'
import {getResource} from '../../../features/resources/resource.service.js'
import * as repository from './room.repository.js'
const create=async({appId,resourceId,roomType,capacity,rentalRate})=>{const owner=requireAppId(appId);const resource=await getResource({id:resourceId,appId:owner});if(resource.type!=='CADENZA_ROOM')throw new BadRequestError('Resource must have type CADENZA_ROOM.');if(!Number.isInteger(Number(capacity))||Number(capacity)<=0)throw new BadRequestError('capacity must be greater than zero.');let rate;try{rate=positiveDecimal(rentalRate,'rentalRate')}catch{throw new BadRequestError('rentalRate must be greater than zero.')};try{return await repository.create({appId:owner,resourceId,roomType,capacity:Number(capacity),rentalRate:rate})}catch(e){if(e?.code==='P2002')throw new ConflictError('Room resource is already registered.');throw e}}
const list=({appId})=>repository.list(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Room not found.');return value}
export {create,list,get}
