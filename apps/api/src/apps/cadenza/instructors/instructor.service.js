import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './instructor.repository.js'
const list=({appId})=>repository.list(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Instructor not found.');return value}
const create=async({appId,personId,specialty})=>{const app=requireAppId(appId);if(!personId)throw new BadRequestError('personId is required.');if(!await repository.personExists(personId))throw new NotFoundError('Person not found.');try{return await repository.create({appId:app,personId,specialty:specialty?.trim()||null})}catch(e){if(e?.code==='P2002')throw new ConflictError('Person is already registered as an instructor for this application.');throw e}}
const update=async({appId,id,...data})=>{const app=requireAppId(appId);if(data.specialty!==undefined)data.specialty=data.specialty?.trim()||null;const current=await repository.findById(id,app);if(!current)throw new NotFoundError('Instructor not found.');const result=await repository.update(id,app,data);if(result.count!==1)throw new ConflictError('Instructor was modified or no longer exists.');return repository.findById(id,app)}
export {list,get,create,update}
