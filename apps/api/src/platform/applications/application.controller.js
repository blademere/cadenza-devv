import { successResponse } from '../../common/responses/apiResponse.js'
import { mapApplication, mapMembership } from './application.mapper.js'
import { getUserApplications, getApplicationByKey } from './application.service.js'
import { selectApplication } from '../../features/auth/auth.service.js'

const listUserApplicationsController = async (req, res) => {
  const apps = await getUserApplications(req.user.id)
  return successResponse(res, 'Applications retrieved successfully.', { apps })
}

const getUserApplicationController = async (req, res) => {
  const application = await getApplicationByKey(req.params.appKey)
  const apps = await getUserApplications(req.user.id)
  const isMember = apps.some((app) => app.id === application.id)
  if (!isMember) {
    const { ForbiddenError } = await import('../../common/errors/appError.js')
    throw new ForbiddenError('User does not have access to this application.')
  }
  return successResponse(res, 'Application retrieved successfully.', { app: mapApplication(application) })
}

const selectApplicationController = async (req, res) => {
  const result = await selectApplication({ userId: req.user.id, appKey: req.params.appKey })
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/api/v1/auth',
  })
  return successResponse(res, 'Application selected successfully.', {
    accessToken: result.accessToken,
    application: mapApplication(result.application),
    membership: mapMembership(result.membership),
  })
}

export {
  listUserApplicationsController,
  getUserApplicationController,
  selectApplicationController,
}
