import { BadRequestError, NotFoundError, ConflictError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './student.repository.js'

const create=async({appId,personId,actorId})=>{
  const app=requireAppId(appId)
  if(!personId) throw new BadRequestError('personId is required.')
  if(Number(actorId)>0){
    const manager = await import('../../../platform/authorization/authorization.service.js').then(({can})=>can({userId:Number(actorId),appId:app,resource:'cadenza_students',action:'manage'}))
    const person = await repository.findPersonByUserId(actorId)
    if(!manager && (!person || String(person.id)!==String(personId))) throw new ConflictError('You can only register your own account as a student.')
  }
  if(!await repository.personExists(personId)) throw new NotFoundError('Person not found.')
  try{return await repository.create({appId:app,personId})}
  catch(e){if(e?.code==='P2002')throw new ConflictError('Person is already registered as a student for this application.');throw e}
}
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Student not found.');return value}
const list=({appId})=>repository.list(requireAppId(appId))
const registerMe=async({appId,actorId})=>{ const app=requireAppId(appId); const person=await repository.findPersonByUserId(actorId); if(!person) throw new NotFoundError('Create your profile before registering as a student.'); return create({appId:app,personId:person.id,actorId}) }
export {create,get,list,registerMe}
