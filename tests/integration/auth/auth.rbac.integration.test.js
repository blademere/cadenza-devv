import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

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

const rbacService = require('../../../src/features/rbac/rbac.service')
const userService = require('../../../src/features/users/user.service')
const { createAccessToken } = require('../../../src/features/auth/auth.tokens')
const hasPermission = vi.spyOn(rbacService, 'hasPermission')
const listUsers = vi.spyOn(userService, 'listUsers')
const registerUser = vi.spyOn(userService, 'registerUser')
const app = require('../../../src/app')

describe('Auth/RBAC integration', () => {
  const user = { id: 42 }

  beforeEach(() => {
    vi.clearAllMocks()
    listUsers.mockResolvedValue({
      data: [{ id: 1, email: 'user@example.com', isActive: true, role: { id: 2, name: 'client' } }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    })
    registerUser.mockResolvedValue({ id: 7, email: 'new@example.com', isActive: true, role: { id: 2, name: 'client' } })
  })

  it('rejects a protected request without an access token', async () => {
    const response = await request(app).get('/api/v1/users')
    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    expect(hasPermission).not.toHaveBeenCalled()
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('rejects a protected request with an invalid access token', async () => {
    const response = await request(app).get('/api/v1/users').set('Authorization', 'Bearer invalid-token')
    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    expect(hasPermission).not.toHaveBeenCalled()
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('rejects an authenticated user when the required permission is missing', async () => {
    hasPermission.mockResolvedValue(false)
    const token = createAccessToken(user)
    const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
    expect(hasPermission).toHaveBeenCalledOnce()
    expect(hasPermission).toHaveBeenCalledWith(42, 'users', 'read')
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('allows an authenticated user with the required read permission', async () => {
    hasPermission.mockResolvedValue(true)
    const token = createAccessToken(user)
    const response = await request(app).get('/api/v1/users?page=1&limit=20').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 })
    expect(hasPermission).toHaveBeenCalledWith(42, 'users', 'read')
    expect(listUsers).toHaveBeenCalledWith({ page: 1, limit: 20 })
  })

  it('enforces the create permission independently from the read permission', async () => {
    hasPermission.mockImplementation(async (_userId, _module, action) => action === 'create')
    const token = createAccessToken(user)
    const forbiddenResponse = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
    expect(forbiddenResponse.status).toBe(403)
    expect(hasPermission).toHaveBeenLastCalledWith(42, 'users', 'read')
    const allowedResponse = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send({ email: 'new@example.com', roleId: 2, password: 'password123' })
    expect(allowedResponse.status).toBe(201)
    expect(allowedResponse.body.success).toBe(true)
    expect(allowedResponse.body.data).toMatchObject({ id: 7, email: 'new@example.com' })
    expect(hasPermission).toHaveBeenLastCalledWith(42, 'users', 'create')
    expect(registerUser).toHaveBeenCalledWith({ email: 'new@example.com', roleId: 2, password: 'password123' })
  })
})
