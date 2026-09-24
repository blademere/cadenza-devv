import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seedOboAuthorization: vi.fn(),
  seedOboWorkflow: vi.fn(),
  seedCadenzaAuthorization: vi.fn(),
  seedPlatformForms: vi.fn(),
  seedOboReferenceData: vi.fn(),
  seedOboDevelopmentScenario: vi.fn(),
  verifyOboDevelopmentScenario: vi.fn(),
  seedOboPlatformConfiguration: vi.fn(),
  verifyOboPlatformConfiguration: vi.fn(),
  bindOboDevelopmentForm: vi.fn(),
  seedRolePersons: vi.fn(),
  seedOboProfessionalVerificationFixtures: vi.fn(),
  verifyOboProfessionalVerificationFixtures: vi.fn(),
  seedOboNotifications: vi.fn(),
}))

vi.mock('../../../../scripts/seed/apps/obo/authorization.js', () => ({ seedOboAuthorization: mocks.seedOboAuthorization }))
vi.mock('../../../../scripts/seed/apps/obo/workflow.js', () => ({ seedOboWorkflow: mocks.seedOboWorkflow }))
vi.mock('../../../../scripts/seed/apps/cadenza/authorization.js', () => ({ seedCadenzaAuthorization: mocks.seedCadenzaAuthorization }))
vi.mock('../../../../scripts/seed/apps/obo/forms.js', () => ({ seedPlatformForms: mocks.seedPlatformForms }))
vi.mock('../../../../scripts/seed/apps/obo/reference.js', () => ({ seedOboReferenceData: mocks.seedOboReferenceData }))
vi.mock('../../../../scripts/seed/apps/obo/development.js', () => ({
  seedOboDevelopmentScenario: mocks.seedOboDevelopmentScenario,
  verifyOboDevelopmentScenario: mocks.verifyOboDevelopmentScenario,
}))
vi.mock('../../../../scripts/seed/apps/obo/platform-configuration.js', () => ({
  seedOboPlatformConfiguration: mocks.seedOboPlatformConfiguration,
  verifyOboPlatformConfiguration: mocks.verifyOboPlatformConfiguration,
}))
vi.mock('../../../../scripts/seed/apps/obo/form-bindings.js', () => ({ bindOboDevelopmentForm: mocks.bindOboDevelopmentForm }))
vi.mock('../../../../scripts/seed/apps/obo/people.js', () => ({ seedRolePersons: mocks.seedRolePersons }))
vi.mock('../../../../scripts/seed/apps/obo/professional-verification.js', () => ({
  seedOboProfessionalVerificationFixtures: mocks.seedOboProfessionalVerificationFixtures,
  verifyOboProfessionalVerificationFixtures: mocks.verifyOboProfessionalVerificationFixtures,
}))
vi.mock('../../../../scripts/seed/apps/obo/notifications.js', () => ({ seedOboNotifications: mocks.seedOboNotifications }))

const { seedObo } = await import('../../../../scripts/seed/apps/obo/index.js')
const { seedCadenza } = await import('../../../../scripts/seed/apps/cadenza/index.js')

const roles = { client: { id: 'role-client' }, cadenza_admin: { id: 'role-admin' } }
const permissions = new Map([['audit_logs:read', { id: 'permission-1' }]])

beforeEach(() => {
  vi.clearAllMocks()
  mocks.seedOboWorkflow.mockResolvedValue({})
  mocks.seedOboAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
  mocks.seedCadenzaAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
  mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })
})

describe('application seed modules', () => {
  it('seeds OBO startup requirements without development/reference data', async () => {
    const prisma = { app: { findUnique: vi.fn().mockResolvedValue({ id: 'app-obo', key: 'obo' }) } }
    const result = await seedObo(prisma, { profile: 'default' })

    expect(mocks.seedOboAuthorization).toHaveBeenCalledWith(prisma, { id: 'app-obo', key: 'obo' })
    expect(mocks.seedOboWorkflow).toHaveBeenCalledWith(prisma)
    expect(mocks.seedPlatformForms).not.toHaveBeenCalled()
    expect(mocks.seedOboReferenceData).not.toHaveBeenCalled()
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(result.application.key).toBe('obo')
  })

  it('keeps OBO development and fixture data profile-specific', async () => {
    const prisma = { app: { findUnique: vi.fn().mockResolvedValue({ id: 'app-obo', key: 'obo' }) } }
    await seedObo(prisma, { profile: 'development' })
    expect(mocks.seedOboDevelopmentScenario).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()

    vi.clearAllMocks()
    mocks.seedOboAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
    mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })

    await seedObo(prisma, { profile: 'fixtures' })
    expect(mocks.seedOboProfessionalVerificationFixtures).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
  })

  it('seeds Cadenza authorization independently', async () => {
    const prisma = { app: { findUnique: vi.fn().mockResolvedValue({ id: 'app-cadenza', key: 'cadenza' }) } }
    const result = await seedCadenza(prisma, { profile: 'default' })

    expect(mocks.seedCadenzaAuthorization).toHaveBeenCalledWith(prisma, { id: 'app-cadenza', key: 'cadenza' })
    expect(mocks.seedPlatformForms).not.toHaveBeenCalled()
    expect(result.application.key).toBe('cadenza')
  })
})
