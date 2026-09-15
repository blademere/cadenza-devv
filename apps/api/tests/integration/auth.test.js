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

vi.mock('../../../src/platform/authorization/access-control.service.js')
vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/features/users/user.service.js')
vi.mock('../../../src/platform/authorization/authorization-context.repository.js')

const accessControlService = await import('../../../src/platform/authorization/access-control.service.js')
const authRepository = await import('../../../src/features/auth/auth.repository.js')
const userService = await import('../../../src/features/users/user.service.js')
const authorizationContextRepository = await import('../../../src/platform/authorization/authorization-context.repository.js')
const { createAccessToken } = await import('../../../src/features/auth/auth.tokens.js')
const { default: app } = await import('../../../src/app.js')

const can = accessControlService.can
const findUserAuthState = authRepository.findUserAuthState
const listUsers = userService.listUsers
const registerUser = userService.registerUser
const getUserAuthorizationContext = authorizationContextRepository.getUserAuthorizationContext
const listActiveModules = authorizationContextRepository.listActiveModules

const user = { id: 42, authVersion: 0 }

describe('Authentication integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUserAuthState.mockResolvedValue({ id: 42, isActive: true, authVersion: 0 })
    listUsers.mockResolvedValue({ data: [{ id: 1, email: 'user@example.com', isActive: true, role: { id: 2, name: 'client' } }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } })
    registerUser.mockResolvedValue({ id: 7, email: 'new@example.com', isActive: true, role: { id: 2, name: 'client' } })
    getUserAuthorizationContext.mockResolvedValue({ userId: 42, role: { id: 3, name: 'receiving_officer' }, permissions: [{ resource: 'obo_plan_permits', action: 'read' }, { resource: 'obo_professionals', action: 'review' }] })
    listActiveModules.mockResolvedValue([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }, { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true }])
  })

  describe('access control', () => {
    it('rejects a protected request without an access token', async () => {
      const response = await request(app).get('/api/v1/users')
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(can).not.toHaveBeenCalled()
      expect(listUsers).not.toHaveBeenCalled()
    })
    it('rejects a protected request with an invalid access token', async () => {
      const response = await request(app).get('/api/v1/users').set('Authorization', 'Bearer invalid-token')
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(can).not.toHaveBeenCalled()
      expect(listUsers).not.toHaveBeenCalled()
    })
    it('rejects an authenticated user when the required permission is missing', async () => {
      can.mockResolvedValue(false)
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(can).toHaveBeenCalledOnce()
      expect(can).toHaveBeenCalledWith({ userId: 42, resource: 'users', action: 'read' })
      expect(listUsers).not.toHaveBeenCalled()
    })
    it('allows an authenticated user with the required read permission', async () => {
      can.mockResolvedValue(true)
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/users?page=1&limit=20').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 })
      expect(can).toHaveBeenCalledWith({ userId: 42, resource: 'users', action: 'read' })
      expect(listUsers).toHaveBeenCalledWith({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })
    })
    it('enforces the create permission independently from the read permission', async () => {
      can.mockImplementation(async ({ action }) => action === 'create')
      const token = createAccessToken(user)
      const forbiddenResponse = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
      expect(forbiddenResponse.status).toBe(403)
      expect(can).toHaveBeenLastCalledWith({ userId: 42, resource: 'users', action: 'read' })
      const idempotencyKey = `auth-access-control-create-user-${crypto.randomUUID()}`
      const allowedResponse = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', idempotencyKey).send({ email: 'new@example.com', roleId: 2, password: 'password123' })
      expect(allowedResponse.status).toBe(201)
      expect(allowedResponse.body.success).toBe(true)
      expect(allowedResponse.body.data).toMatchObject({ id: 7, email: 'new@example.com' })
      expect(can).toHaveBeenLastCalledWith({ userId: 42, resource: 'users', action: 'create' })
      expect(registerUser).toHaveBeenCalledWith({ requesterId: 42, email: 'new@example.com', roleId: 2, password: 'password123' })
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
      listActiveModules.mockResolvedValue([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }])
      const token = createAccessToken(user)
      const response = await request(app).get('/api/v1/me/authorization').set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(200)
      expect(response.body.data.permissions).toEqual(['obo_plan_permits:read', 'obo_professionals:review'])
      expect(response.body.data.modules).toEqual([{ key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true }])
    })
  })
})