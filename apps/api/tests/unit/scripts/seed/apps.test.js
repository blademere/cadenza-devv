import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seedApplication: vi.fn(),
  seedAuthorization: vi.fn(),
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
  ensureAppRole: vi.fn(),
  ensurePerson: vi.fn(),
}))

vi.mock('../../../../../scripts/seed/applications.js', () => ({ seedApplication: mocks.seedApplication }))
vi.mock('../../../../../scripts/seed/authorization.js', () => ({ seedAuthorization: mocks.seedAuthorization }))
vi.mock('../../../../../scripts/seed/platform-forms.js', () => ({ seedPlatformForms: mocks.seedPlatformForms }))
vi.mock('../../../../../scripts/seed/obo-reference.js', () => ({ seedOboReferenceData: mocks.seedOboReferenceData }))
vi.mock('../../../../../scripts/seed/obo-development.js', () => ({
  seedOboDevelopmentScenario: mocks.seedOboDevelopmentScenario,
  verifyOboDevelopmentScenario: mocks.verifyOboDevelopmentScenario,
}))
vi.mock('../../../../../scripts/seed/obo-platform-configuration.js', () => ({
  seedOboPlatformConfiguration: mocks.seedOboPlatformConfiguration,
  verifyOboPlatformConfiguration: mocks.verifyOboPlatformConfiguration,
}))
vi.mock('../../../../../scripts/seed/obo-form-bindings.js', () => ({ bindOboDevelopmentForm: mocks.bindOboDevelopmentForm }))
vi.mock('../../../../../scripts/seed/people.js', () => ({ seedRolePersons: mocks.seedRolePersons }))
vi.mock('../../../../../scripts/seed/obo-professional-verification.js', () => ({
  seedOboProfessionalVerificationFixtures: mocks.seedOboProfessionalVerificationFixtures,
  verifyOboProfessionalVerificationFixtures: mocks.verifyOboProfessionalVerificationFixtures,
}))
vi.mock('../../../../../scripts/seed/notifications.js', () => ({ seedOboNotifications: mocks.seedOboNotifications }))
vi.mock('../../../../../scripts/seed/development-users.js', () => ({
  ensureAppRole: mocks.ensureAppRole,
  ensurePerson: mocks.ensurePerson,
}))

const { seedObo } = await import('../../../../../scripts/seed/apps/obo.js')
const { seedCadenza } = await import('../../../../../scripts/seed/apps/cadenza.js')

const roles = { client: { id: 'role-client' }, cadenza_admin: { id: 'role-admin' } }
const permissions = new Map([['audit_logs:read', { id: 'permission-1' }]])

beforeEach(() => {
  vi.clearAllMocks()
  mocks.seedApplication.mockImplementation(async (_prisma, key) => ({ id: `app-${key}`, key }))
  mocks.seedAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
  mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })
})

describe('application seed modules', () => {
  it('seeds OBO without Cadenza data', async () => {
    const result = await seedObo({}, { profile: 'default' })

    expect(mocks.seedApplication).toHaveBeenCalledWith({}, 'obo')
    expect(mocks.seedAuthorization).toHaveBeenCalledWith({}, {
      applications: { obo: { id: 'app-obo', key: 'obo' } },
      applicationKeys: ['obo'],
    })
    expect(mocks.seedPlatformForms).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboReferenceData).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(mocks.seedCadenza).toBeUndefined()
    expect(result.application.key).toBe('obo')
  })

  it('keeps OBO development and fixture data profile-specific', async () => {
    await seedObo({}, { profile: 'development' })
    expect(mocks.seedOboDevelopmentScenario).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()

    vi.clearAllMocks()
    mocks.seedApplication.mockImplementation(async (_prisma, key) => ({ id: `app-${key}`, key }))
    mocks.seedAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
    mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })

    await seedObo({}, { profile: 'fixtures' })
    expect(mocks.seedOboProfessionalVerificationFixtures).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
  })

  it('seeds Cadenza authorization independently', async () => {
    const result = await seedCadenza({}, { profile: 'default' })

    expect(mocks.seedApplication).toHaveBeenCalledWith({}, 'cadenza')
    expect(mocks.seedAuthorization).toHaveBeenCalledWith({}, {
      applications: { cadenza: { id: 'app-cadenza', key: 'cadenza' } },
      applicationKeys: ['cadenza'],
    })
    expect(mocks.seedPlatformForms).not.toHaveBeenCalled()
    expect(result.application.key).toBe('cadenza')
  })
})
