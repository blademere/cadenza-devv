import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import * as instructorRepository from './instructor.repository.js'
import * as repository from './instructor-availability.repository.js'

const assertManager = async (actorId, appId) => {
  if (!(await can({ userId: Number(actorId), appId, resource: 'cadenza_instructors', action: 'manage' })))
    throw new ForbiddenError('Only instructor management staff can change instructor availability.')
}

const assertInstructorAccess = async ({ appId, instructorId, actorId }) => {
  const instructor = await instructorRepository.findById(instructorId, appId)
  if (!instructor) throw new NotFoundError('Instructor not found.')
  const manager = await can({ userId: Number(actorId), appId, resource: 'cadenza_instructors', action: 'manage' })
  const self = Number(instructor.person?.userId) === Number(actorId)
  if (!manager && !self) throw new ForbiddenError('You can only view your own instructor availability.')
  return instructor
}

const normalizeRules = (rules) => {
  if (!Array.isArray(rules)) throw new BadRequestError('rules must be an array.')
  const seen = new Set()
  return rules.map((rule) => {
    const dayOfWeek = Number(rule.dayOfWeek)
    const startMinute = Number(rule.startMinute)
    const endMinute = Number(rule.endMinute)
    if (![0,1,2,3,4,5,6].includes(dayOfWeek))
      throw new BadRequestError('dayOfWeek must be between 0 and 6.')
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute < 0 || endMinute > 1440 || startMinute >= endMinute)
      throw new BadRequestError('Availability minutes must be integers between 0 and 1440 with endMinute after startMinute.')
    const key = dayOfWeek + ':' + startMinute + ':' + endMinute
    if (seen.has(key)) throw new BadRequestError('Duplicate instructor availability rule.')
    seen.add(key)
    return { dayOfWeek, startMinute, endMinute }
  })
}

const get = async ({ appId, instructorId, actorId }) => {
  const owner = requireAppId(appId)
  await assertInstructorAccess({ appId: owner, instructorId, actorId })
  return {
    rules: await repository.listRules(instructorId, owner),
    blocks: await repository.listBlocks(instructorId, owner),
  }
}

const replace = async ({ appId, instructorId, actorId, rules }) => {
  const owner = requireAppId(appId)
  await assertManager(actorId, owner)
  const instructor = await instructorRepository.findById(instructorId, owner)
  if (!instructor) throw new NotFoundError('Instructor not found.')
  const normalized = normalizeRules(rules)
  normalized.sort((a,b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
  for (let i = 0; i < normalized.length; i++) {
    const current = normalized[i]
    const next = normalized[i + 1]
    if (next && current.dayOfWeek === next.dayOfWeek && current.endMinute > next.startMinute)
      throw new ConflictError('Instructor availability rules cannot overlap.')
  }
  return repository.withTransaction((tx) => repository.replaceRules(instructorId, owner, normalized, tx))
}

const addBlock = async ({ appId, instructorId, actorId, startsAt, endsAt, reason }) => {
  const owner = requireAppId(appId)
  await assertManager(actorId, owner)
  const instructor = await instructorRepository.findById(instructorId, owner)
  if (!instructor) throw new NotFoundError('Instructor not found.')
  const start = new Date(startsAt), end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end)
    throw new BadRequestError('endsAt must be after startsAt.')
  if (await repository.findOverlappingBlock(instructorId, owner, start, end))
    throw new ConflictError('Instructor already has an overlapping blocked period.')
  return repository.createBlock({ instructorId, appId: owner, startsAt: start, endsAt: end, reason: reason?.trim() || null })
}

const removeBlock = async ({ appId, instructorId, blockId, actorId }) => {
  const owner = requireAppId(appId)
  await assertManager(actorId, owner)
  const result = await repository.deleteBlock(blockId, instructorId, owner)
  if (result.count !== 1) throw new NotFoundError('Instructor blocked period not found.')
  return { id: blockId }
}

const getLocalParts = (date, timeZone = process.env.CADENZA_TIMEZONE || 'Asia/Manila') => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]))
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    day: weekdays[values.weekday],
    minute: Number(values.hour) * 60 + Number(values.minute),
  }
}

const isWithinWeeklyAvailability = (rules, start, end) => {
  const localStart = getLocalParts(start)
  const localEnd = getLocalParts(end)
  return rules.some((rule) =>
    rule.dayOfWeek === localStart.day &&
    rule.startMinute <= localStart.minute &&
    rule.endMinute >= localEnd.minute &&
    localEnd.day === localStart.day
  )
}

const assertAvailable = async ({ appId, instructorId, startsAt, endsAt, db }) => {
  const owner = requireAppId(appId)
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt)
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end)
    throw new BadRequestError('Instructor availability window is invalid.')
  const rules = await repository.listRules(instructorId, owner, db)
  if (rules.length && !isWithinWeeklyAvailability(rules, start, end))
    throw new ConflictError('Instructor is outside their configured availability.')
  const block = await repository.findOverlappingBlock(instructorId, owner, start, end, db)
  if (block) throw new ConflictError('Instructor is unavailable during the requested time.')
  return true
}

export { get, replace, addBlock, removeBlock, assertAvailable, normalizeRules, isWithinWeeklyAvailability }
