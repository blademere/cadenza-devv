import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserApplications: vi.fn(),
  getApplicationByKey: vi.fn(),
  issueApplicationSession: vi.fn(),
}))

vi.mock('../../../../src/platform/applications/application.service.js', () => ({
  getUserApplications: mocks.getUserApplications,
  getApplicationByKey: mocks.getApplicationByKey,
}))

import {
  listUserApplicationsController,
  getUserApplicationController,
  selectApplicationController,
} from '../../../../src/platform/applications/application.controller.js'

describe('application controllers', () => {
  beforeEach(() => vi.clearAllMocks())

  const response = () => ({
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  })

  it('lists only applications available to the authenticated user', async () => {
    const apps = [{ id: 'obo-id', key: 'obo', name: 'One-Stop Business Office' }]
    mocks.getUserApplications.mockResolvedValue(apps)
    const res = response()

    await listUserApplicationsController({ user: { id: 42 } }, res)

    expect(mocks.getUserApplications).toHaveBeenCalledWith(42)
    expect(res.json).toHaveBeenCalled()
  })

  it('denies access to an application the user is not a member of', async () => {
    mocks.getApplicationByKey.mockResolvedValue({ id: 'other-id', key: 'other', name: 'Other App' })
    mocks.getUserApplications.mockResolvedValue([])

    await expect(
      getUserApplicationController({ user: { id: 42 }, params: { appKey: 'other' } }, response()),
    ).rejects.toThrow('User does not have access to this application.')
  })

  it('selects an application and issues an app-scoped access token', async () => {
    const result = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      application: { id: 'obo-id', key: 'obo', name: 'One-Stop Business Office' },
      membership: { id: 'membership-id', app: { id: 'obo-id', key: 'obo' }, roles: [] },
    }
    mocks.issueApplicationSession.mockResolvedValue(result)
    const res = response()

    await selectApplicationController(mocks.issueApplicationSession)({ user: { id: 42 }, params: { appKey: 'obo' } }, res)

    expect(mocks.issueApplicationSession).toHaveBeenCalledWith({ userId: 42, appKey: 'obo' })
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.objectContaining({ httpOnly: true }))
    expect(res.json).toHaveBeenCalled()
  })
})
