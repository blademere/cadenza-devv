import { BadRequestError, ConflictError } from '../../common/errors/appError.js'

const CONFIGURATION_STATUS = Object.freeze({ DRAFT:'DRAFT', VALIDATED:'VALIDATED', PUBLISHED:'PUBLISHED', ARCHIVED:'ARCHIVED' })
const TRANSITIONS = Object.freeze({ DRAFT:new Set([CONFIGURATION_STATUS.VALIDATED]), VALIDATED:new Set([CONFIGURATION_STATUS.DRAFT,CONFIGURATION_STATUS.PUBLISHED]), PUBLISHED:new Set([CONFIGURATION_STATUS.ARCHIVED]), ARCHIVED:new Set([CONFIGURATION_STATUS.PUBLISHED]) })
const assertKnownStatus = (status) => { if(!Object.values(CONFIGURATION_STATUS).includes(status)) throw new BadRequestError(`Unknown configuration status '${status}'.`) }
const assertTransition = (from,to) => { assertKnownStatus(from); assertKnownStatus(to); if(from===to) return true; if(!TRANSITIONS[from]?.has(to)) throw new ConflictError(`Invalid configuration lifecycle transition: ${from} -> ${to}.`); return true }
const assertMutable = (status) => { assertKnownStatus(status); if(status===CONFIGURATION_STATUS.PUBLISHED||status===CONFIGURATION_STATUS.ARCHIVED) throw new ConflictError(`Configuration in ${status} status is immutable.`) }
const assertPublishable = (status) => { assertTransition(status,CONFIGURATION_STATUS.PUBLISHED) }
const assertRollbackTarget = (status) => { if(status!==CONFIGURATION_STATUS.ARCHIVED) throw new ConflictError('Only an archived configuration can be used as a rollback target.') }
const buildPublishWhere = ({id,parentId,expectedStatus}) => ({ id, ...(parentId?{[parentId.field]:parentId.value}:{}), status:expectedStatus })

export { CONFIGURATION_STATUS, TRANSITIONS, assertKnownStatus, assertTransition, assertMutable, assertPublishable, assertRollbackTarget, buildPublishWhere }
