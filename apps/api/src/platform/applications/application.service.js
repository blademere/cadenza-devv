import {
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/appError.js'
import {
  getAppByKey,
  getAppById,
  listActiveApps,
  getMembership,
  getMembershipById,
  listUserApps,
  createMembership,
  disableMembership,
  assignMembershipRole,
  removeMembershipRole,
  listMembershipRoles,
} from './application.repository.js'
import { mapApplication, mapMembership } from './application.mapper.js'

const requireAppByKey = async (key) => {
  const app = await getAppByKey(key)
  if (!app) throw new NotFoundError(`Application '${key}' was not found.`)
  return app
}

const requireAppById = async (id) => {
  const app = await getAppById(id)
  if (!app) throw new NotFoundError(`Application '${id}' was not found.`)
  return app
}

const getApplicationByKey = async (key) => mapApplication(await requireAppByKey(key))

const getApplicationById = async (id) => mapApplication(await requireAppById(id))

const getActiveApplications = async () => {
  const apps = await listActiveApps()
  return apps.map(mapApplication)
}

const getUserMembership = async ({ userId, appId }) => {
  const membership = await getMembership({ userId, appId })
  if (!membership || !membership.isActive || !membership.app.isActive) return null
  return mapMembership(membership)
}

const getUserApplications = async (userId) => {
  const memberships = await listUserApps(userId)
  return memberships.map((membership) => mapApplication(membership.app))
}

const addMembership = async ({ userId, appId }) => {
  const app = await requireAppById(appId)
  return mapMembership(await createMembership({ userId, appId: app.id }))
}

const disableUserMembership = async ({ userId, appId }) => {
  await requireAppById(appId)
  return disableMembership({ userId, appId })
}

const addMembershipRole = async ({ membershipId, roleId }) => {
  const membership = await getMembershipById(membershipId)
  if (!membership) throw new NotFoundError(`Membership '${membershipId}' was not found.`)
  return assignMembershipRole({ membershipId, roleId })
}

const removeMembershipRoleAssignment = async ({ membershipId, roleId }) => removeMembershipRole({ membershipId, roleId })

const getRolesForMembership = async (membershipId) => listMembershipRoles(membershipId)

const requireActiveMembership = async ({ userId, appId }) => {
  const membership = await getMembership({ userId, appId })
  if (!membership || !membership.isActive || !membership.app.isActive) {
    throw new ForbiddenError('User does not have an active membership for this application.')
  }
  return membership
}

export {
  requireAppByKey,
  requireAppById,
  getApplicationByKey,
  getApplicationById,
  getActiveApplications,
  getUserMembership,
  getUserApplications,
  addMembership,
  disableUserMembership,
  addMembershipRole,
  removeMembershipRoleAssignment,
  getRolesForMembership,
  requireActiveMembership,
}
