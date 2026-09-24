import { successResponse } from '../../common/responses/apiResponse.js'
import { ForbiddenError } from '../../common/errors/appError.js'
import { mapApplication } from './application.mapper.js'
import { getUserApplications, getApplicationByKey } from './application.service.js'
import { env } from '../../config/index.js'

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/api/v1/auth',
  maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
}

const listUserApplicationsController = async (req, res) => {
  const apps = await getUserApplications(req.user.id)
  return successResponse(res, 'Applications retrieved successfully.', { apps })
}

const getUserApplicationController = async (req, res) => {
  const application = await getApplicationByKey(req.params.appKey)
  const apps = await getUserApplications(req.user.id)
  const isMember = apps.some((app) => app.id === application.id)
  if (!isMember) throw new ForbiddenError('User does not have access to this application.')
  return successResponse(res, 'Application retrieved successfully.', { app: mapApplication(application) })
}

const selectApplicationController = (issueApplicationSession) => async (req, res) => {
  if (typeof issueApplicationSession !== 'function') throw new TypeError('Application selection requires an authentication session issuer.')
  const result = await issueApplicationSession({ userId: req.user.id, appKey: req.params.appKey })
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions)
  return successResponse(res, 'Application selected successfully.', {
    accessToken: result.accessToken,
    application: mapApplication(result.application),
    membership: result.membership,
  })
}

export {
  listUserApplicationsController,
  getUserApplicationController,
  selectApplicationController,
}
