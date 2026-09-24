import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import * as repository from './instructor.repository.js'
import * as lessonRepository from '../lessons/lesson.repository.js'
import { ensureMembershipRole } from '../authorization/authorization-management.service.js'

const list=({appId})=>repository.list(requireAppId(appId))
const listCandidates=({appId})=>repository.listCandidates(requireAppId(appId))
const get=async({appId,id})=>{const value=await repository.findById(id,requireAppId(appId));if(!value)throw new NotFoundError('Instructor not found.');return value}
const create=async({appId,personId,specialty,actorId})=>{const app=requireAppId(appId);if(!personId)throw new BadRequestError('personId is required.');if(!await repository.findEligiblePerson(personId,app))throw new NotFoundError('Eligible person not found.');try{const created=await repository.create({appId:app,personId,specialty:specialty?.trim()||null});if(!created)throw new BadRequestError('Person must have an authenticated user identity.');await ensureMembershipRole({userId:created.person?.userId,appId:app,roleName:'cadenza_instructor',actorId});return created}catch(e){if(e?.code==='P2002')throw new ConflictError('Person is already registered as an instructor for this application.');throw e}}
const listMySchedule=async({appId,actorId})=>{const app=requireAppId(appId);const instructor=await repository.findByActor(actorId,app);if(!instructor)throw new ForbiddenError('You are not an active Cadenza instructor.');return lessonRepository.listSessionsForInstructorActor(app,actorId)}
const update=async({appId,id,...data})=>{const app=requireAppId(appId);if(data.specialty!==undefined)data.specialty=data.specialty?.trim()||null;const current=await repository.findById(id,app);if(!current)throw new NotFoundError('Instructor not found.');const result=await repository.update(id,app,data);if(result.count!==1)throw new ConflictError('Instructor was modified or no longer exists.');return repository.findById(id,app)}
export {list,listCandidates,get,create,update,listMySchedule}
