import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seedApplication: vi.fn(),
  seedOboAuthorization: vi.fn(),
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

vi.mock('../../../../scripts/seed/applications.js', () => ({ seedApplication: mocks.seedApplication }))
vi.mock('../../../../scripts/seed/apps/obo/authorization.js', () => ({ seedOboAuthorization: mocks.seedOboAuthorization }))
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
  mocks.seedApplication.mockImplementation(async (_prisma, key) => ({ id: `app-${key}`, key }))
  mocks.seedOboAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
  mocks.seedCadenzaAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
  mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })
})

describe('application seed modules', () => {
  it('seeds OBO without Cadenza data', async () => {
    const result = await seedObo({}, { profile: 'default' })

    expect(mocks.seedApplication).toHaveBeenCalledWith({}, 'obo')
    expect(mocks.seedOboAuthorization).toHaveBeenCalledWith({}, { id: 'app-obo', key: 'obo' })
    expect(mocks.seedPlatformForms).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboReferenceData).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(result.application.key).toBe('obo')
  })

  it('keeps OBO development and fixture data profile-specific', async () => {
    await seedObo({}, { profile: 'development' })
    expect(mocks.seedOboDevelopmentScenario).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()

    vi.clearAllMocks()
    mocks.seedApplication.mockImplementation(async (_prisma, key) => ({ id: `app-${key}`, key }))
    mocks.seedOboAuthorization.mockResolvedValue({ roles, permissionRecords: permissions })
    mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1' } })

    await seedObo({}, { profile: 'fixtures' })
    expect(mocks.seedOboProfessionalVerificationFixtures).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
  })

  it('seeds Cadenza authorization independently', async () => {
    const result = await seedCadenza({}, { profile: 'default' })

    expect(mocks.seedApplication).toHaveBeenCalledWith({}, 'cadenza')
    expect(mocks.seedCadenzaAuthorization).toHaveBeenCalledWith({}, { id: 'app-cadenza', key: 'cadenza' })
    expect(mocks.seedPlatformForms).not.toHaveBeenCalled()
    expect(result.application.key).toBe('cadenza')
  })
})
