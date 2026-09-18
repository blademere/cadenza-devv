import {Prisma} from '@prisma/client'
import {BadRequestError,ConflictError,NotFoundError} from '../../../common/errors/appError.js'
import {requireAppId} from '../../../platform/applications/application-scope.js'
import {getResource} from '../../../features/resources/resource.service.js'
import * as repository from './instrument.repository.js'
const create=async({appId,resourceId,instrumentType,brand,model,serialNumber,rentalRate})=>{const owner=requireAppId(appId);if(!resourceId)throw new BadRequestError('resourceId is required.');const resource=await getResource({id:resourceId,appId:owner});if(resource.type!=='CADENZA_INSTRUMENT')throw new BadRequestError('Resource must have type CADENZA_INSTRUMENT.');let rate;try{rate=new Prisma.Decimal(rentalRate)}catch{throw new BadRequestError('rentalRate must be greater than zero.')}if(!rate.isFinite()||rate.lte(0))throw new BadRequestError('rentalRate must be greater than zero.');try{return await repository.create({appId:owner,resourceId,instrumentType,brand:brand||null,model:model||null,serialNumber:serialNumber||null,rentalRate:rate})}catch(e){if(e?.code==='P2002')throw new ConflictError('Instrument resource or serial number is already registered.');throw e}}
const list=({appId})=>repository.list(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Instrument not found.');return value}
export {create,list,get}
