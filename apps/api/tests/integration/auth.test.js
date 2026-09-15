import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import crypto from 'node:crypto'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key-minimum-32-characters'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-minimum-32-characters'
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
process.env.COOKIE_REFRESH_MAX_AGE_MS = process.env.COOKIE_REFRESH_MAX_AGE_MS || '604800000'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
process.env.COOKIE_SECURE = 'false'
process.env.COOKIE_SAME_SITE = 'lax'

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  findUserAuthState: vi.fn(),
  listUsers: vi.fn(),
  registerUser: vi.fn(),
  getUserAuthorizationContext: vi.fn(),
  listActiveModules: vi.fn(),
}))

vi.mock('../../../src/platform/authorization/access-control.service.js', () => ({
  can: mocks.can,
  canAny: vi.fn(),
  canOwn: vi.fn(),
  getAuthorizationContext: vi.fn(),
  getRoleById: vi.fn(),
}))

vi.mock('../../../src/features/auth/auth.repository.js', () => ({
  findUserAuthState: mocks.findUserAuthState,
}))

vi.mock('../../../src/features/users/user.service.js', () => ({
  listUsers: mocks.listUsers,
  registerUser: mocks.registerUser,
}))

vi.mock('../../../src/platform/authorization/authorization-context.repository.js', () => ({
  getUserAuthorizationContext: mocks.getUserAuthorizationContext,
  listActiveModules: mocks.listActiveModules,
}))

const { createAccessToken } = await import('../../../src/features/auth/auth.tokens.js')
const { default: app } = await import('../../../src/app.js')

const user = { id: 42, authVersion: 0 }

describe('Authentication integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUserAuthState.mockResolvedValue({ id: 42, isActive: true, authVersion: 0 })
    mocks.listUsers.mockResolvedValue({ data: [{ id: 1, email: 'user@example.com', isActive: true, role: { id: 2, name: 'client' } }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } })
    mocks.registerUser.mockResolvedValue({ id: 7, email: 'new@example.com', isActive: true, role: { id: 2, name: 'client' } })
    mocks.getUserAuthorizationContext.mockResolvedValue({ userId: 42, role: { id: 3, name: 'receiving_officer' }, permissions: [{ resource: 'obo_plan_permits', action: 'read' }, { resource: 'obo_professionals', action: 'review' }] })
    mocks.listActiveModules.mockResolvedValue([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }, { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true }])
  })

  describe('access control', () => {
    it('rejects a protected request without an access token', async () => {
      const response = await request(app).get('/api/v1/users')
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(mocks.can).not.toHaveBeenCalled()
      expect(mocks.listUsers).not.toHaveBeenCalled()
    })
    it('rejects a protected request with an invalid access token', async () => {
      const response = await request(app).get('/api/v1/users').set('Authorization', 'Bearer invalid-token')
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(mocks.can).not.toHaveBeenCalled()
      expect(mocks.listUsers).not.toHaveBeenCalled()
    })
    it('rejects an authenticated user when the required permission is missing', async () => {
      mocks.can.mockResolvedValue(false)
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(mocks.can).toHaveBeenCalledOnce()
      expect(mocks.can).toHaveBeenCalledWith({ userId: 42, resource: 'users', action: 'read' })
      expect(mocks.listUsers).not.toHaveBeenCalled()
    })
    it('allows an authenticated user with the required read permission', async () => {
      mocks.can.mockResolvedValue(true)
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/users?page=1&limit=20').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 })
      expect(mocks.can).toHaveBeenCalledWith({ userId: 42, resource: 'users', action: 'read' })
      expect(mocks.listUsers).toHaveBeenCalledWith({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })
    })
    it('enforces the create permission independently from the read permission', async () => {
      mocks.can.mockImplementation(async ({ action }) => action === 'create')
      const token = createAccessToken(user)
      const forbiddenResponse = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
      expect(forbiddenResponse.status).toBe(403)
      expect(mocks.can).toHaveBeenLastCalledWith({ userId: 42, resource: 'users', action: 'read' })
      const idempotencyKey = `auth-access-control-create-user-${crypto.randomUUID()}`
      const allowedResponse = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', idempotencyKey).send({ email: 'new@example.com', roleId: 2, password: 'password123' })
      expect(allowedResponse.status).toBe(201)
      expect(allowedResponse.body.success).toBe(true)
      expect(allowedResponse.body.data).toMatchObject({ id: 7, email: 'new@example.com' })
      expect(mocks.can).toHaveBeenLastCalledWith({ userId: 42, resource: 'users', action: 'create' })
      expect(mocks.registerUser).toHaveBeenCalledWith({ requesterId: 42, email: 'new@example.com', roleId: 2, password: 'password123' })
    })
  })

  describe('authorization context', () => {
    it('requires authentication', async () => {
      const response = await request(app).get('/api/v1/me/authorization')
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
    it('returns authorization state without frontend capabilities', async () => {
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/me/authorization').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({ role: { id: 3, name: 'receiving_officer' }, permissions: ['obo_plan_permits:read', 'obo_professionals:review'], modules: [{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }, { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true }] })
      expect(response.body.data).not.toHaveProperty('navigation')
    })
    it('returns only active modules while preserving effective permissions', async () => {
      mocks.listActiveModules.mockResolvedValue([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }])
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/me/authorization').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.data.permissions).toEqual(['obo_plan_permits:read', 'obo_professionals:review'])
      expect(response.body.data.modules).toEqual([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }])
    })
  })
})