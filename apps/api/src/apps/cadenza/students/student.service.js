import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './student.repository.js'

const create=async({appId,personId})=>{
  const app=requireAppId(appId)
  if(!personId) throw new BadRequestError('personId is required.')
  if(!await repository.personExists(personId)) throw new NotFoundError('Person not found.')
  try{return await repository.create({appId:app,personId})}
  catch(e){if(e?.code==='P2002')throw new ConflictError('Person is already registered as a student for this application.');throw e}
}
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Student not found.');return value}
const list=({appId})=>repository.list(requireAppId(appId))
export {create,get,list}
