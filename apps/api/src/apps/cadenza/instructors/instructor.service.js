import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './instructor.repository.js'
const list=({appId})=>repository.list(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Instructor not found.');return value}
const create=async({appId,personId,specialty})=>{
  const app=requireAppId(appId)
  if(!personId) throw new BadRequestError('personId is required.')
  if(!await repository.personExists(personId)) throw new NotFoundError('Person not found.')
  try{return await repository.create({appId:app,personId,specialty:specialty?.trim()||null})}
  catch(e){if(e?.code==='P2002')throw new ConflictError('Person is already registered as an instructor for this application.');throw e}
}
export {list,get,create}
