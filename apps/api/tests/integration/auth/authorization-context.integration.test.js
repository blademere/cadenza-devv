import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'test-access-secret-key-minimum-32-characters'
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-refresh-secret-key-minimum-32-characters'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
process.env.COOKIE_SECURE = 'false'
process.env.COOKIE_SAME_SITE = 'lax'

const mocks = vi.hoisted(() => ({
  findUserAuthState: vi.fn(),
  getUserAuthorizationContext: vi.fn(),
  listActiveModules: vi.fn(),
}))

vi.mock('../../../src/features/auth/auth.repository.js', () => ({
  findUserAuthState: mocks.findUserAuthState,
}))

vi.mock('../../../src/platform/authorization/authorization-context.repository.js', () => ({
  getUserAuthorizationContext: mocks.getUserAuthorizationContext,
  listActiveModules: mocks.listActiveModules,
}))

const { createAccessToken } = await import('../../../src/features/auth/auth.tokens.js')
const { default: app } = await import('../../../src/app.js')

describe('Authorization context integration', () => {
  const user = { id: 42, authVersion: 0 }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUserAuthState.mockResolvedValue({
      id: 42,
      isActive: true,
      authVersion: 0,
    })
    mocks.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      role: { id: 3, name: 'receiving_officer' },
      permissions: [
        { resource: 'obo_plan_permits', action: 'read' },
        { resource: 'obo_professionals', action: 'review' },
      ],
    })
    mocks.listActiveModules.mockResolvedValue([
      {
        key: 'obo_plan_permits',
        name: 'Plan Permits',
        description: null,
        isActive: true,
      },
      {
        key: 'obo_professionals',
        name: 'Professionals',
        description: null,
        isActive: true,
      },
    ])
  })

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/me/authorization')
    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
  })

  it('returns the authenticated user effective authorization context', async () => {
    const token = createAccessToken(user)
    const response = await request(app)
      .get('/api/v1/me/authorization')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.role).toEqual({ id: 3, name: 'receiving_officer' })
    expect(response.body.data.permissions).toEqual([
      'obo_plan_permits:read',
      'obo_professionals:review',
    ])

    const applications = response.body.data.navigation.find(
      (item) => item.key === 'applications',
    )
    const verification = response.body.data.navigation.find(
      (item) => item.key === 'verification',
    )

    expect(applications.visible).toBe(false)
    expect(verification.visible).toBe(false)
  })

  it('hides capabilities for inactive modules even if the role has the permission', async () => {
    mocks.listActiveModules.mockResolvedValue([
      {
        key: 'obo_plan_permits',
        name: 'Plan Permits',
        description: null,
        isActive: true,
      },
      {
        key: 'obo_professionals',
        name: 'Professionals',
        description: null,
        isActive: false,
      },
    ])

    const token = createAccessToken(user)
    const response = await request(app)
      .get('/api/v1/me/authorization')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(
      response.body.data.navigation.find((item) => item.key === 'applications').visible,
    ).toBe(false)
    expect(
      response.body.data.navigation.find((item) => item.key === 'verification').visible,
    ).toBe(false)
  })
})