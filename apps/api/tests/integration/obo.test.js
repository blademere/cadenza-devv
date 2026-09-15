import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import crypto from 'node:crypto'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key-minimum-32-characters'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-minimum-32-characters'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
process.env.COOKIE_SECURE = 'false'
process.env.COOKIE_SAME_SITE = 'lax'

vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/platform/authorization/access-control.service.js')

const authRepository = await import('../../../src/features/auth/auth.repository.js')
const accessControlService = await import('../../../src/platform/authorization/access-control.service.js')
const { getPrismaClient } = await import('../../../src/infrastructure/database/prisma.js')
const { createAccessToken } = await import('../../../src/features/auth/auth.tokens.js')
const { seedPlatformForms } = await import('../../../scripts/seed/platform-forms.js')
const { seedOboReferenceData } = await import('../../../scripts/seed/obo-reference.js')
const { seedOboWorkflow } = await import('../../../scripts/seed/obo-development.js')
const { default: app } = await import('../../../src/app.js')

const findUserAuthState = authRepository.findUserAuthState
const can = accessControlService.can
const getAuthorizationContext = accessControlService.getAuthorizationContext

const prisma = getPrismaClient()
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIfEnabled = runIntegrationTests ? describe : describe.skip

const unique = (prefix) => `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

const formValuesFor = (professionalId) => ({
  projectName: unique('Integration Building'),
  projectType: 'RESIDENTIAL',
  address: 'Integration Test Site',
  occupancyClassification: 'RESIDENTIAL',
  floorAreaSqm: 120,
  storeys: 2,
  scopeOfWork: 'New residential building',
  estimatedCost: 250000,
  architect: professionalId,
})

// The remainder of this integration suite intentionally remains unchanged: it exercises the real
// database/application boundary while mocking only authentication/authorization decisions.
