import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seedApplications: vi.fn(),
  seedAuthorization: vi.fn(),
  seedOboDevelopmentScenario: vi.fn(),
  verifyOboDevelopmentScenario: vi.fn(),
  seedOboNotifications: vi.fn(),
  seedOboReferenceData: vi.fn(),
  seedPlatformForms: vi.fn(),
  seedOboPlatformConfiguration: vi.fn(),
  verifyOboPlatformConfiguration: vi.fn(),
  bindOboDevelopmentForm: vi.fn(),
  seedDevelopmentUsers: vi.fn(),
  seedRolePersons: vi.fn(),
  seedOboProfessionalVerificationFixtures: vi.fn(),
  verifyOboProfessionalVerificationFixtures: vi.fn(),
  seedModelCoverage: vi.fn(),
}))

vi.mock('../../../../scripts/seed/applications.js', () => ({
  seedApplications: mocks.seedApplications,
}))
vi.mock('../../../../scripts/seed/authorization.js', () => ({
  seedAuthorization: mocks.seedAuthorization,
}))
vi.mock('../../../../scripts/seed/obo-development.js', () => ({
  seedOboDevelopmentScenario: mocks.seedOboDevelopmentScenario,
  verifyOboDevelopmentScenario: mocks.verifyOboDevelopmentScenario,
}))
vi.mock('../../../../scripts/seed/notifications.js', () => ({
  seedOboNotifications: mocks.seedOboNotifications,
}))
vi.mock('../../../../scripts/seed/obo-reference.js', () => ({
  seedOboReferenceData: mocks.seedOboReferenceData,
}))
vi.mock('../../../../scripts/seed/platform-forms.js', () => ({
  seedPlatformForms: mocks.seedPlatformForms,
}))
vi.mock('../../../../scripts/seed/obo-platform-configuration.js', () => ({
  seedOboPlatformConfiguration: mocks.seedOboPlatformConfiguration,
  verifyOboPlatformConfiguration: mocks.verifyOboPlatformConfiguration,
}))
vi.mock('../../../../scripts/seed/obo-form-bindings.js', () => ({
  bindOboDevelopmentForm: mocks.bindOboDevelopmentForm,
}))
vi.mock('../../../../scripts/seed/development-users.js', () => ({
  seedDevelopmentUsers: mocks.seedDevelopmentUsers,
}))
vi.mock('../../../../scripts/seed/people.js', () => ({
  seedRolePersons: mocks.seedRolePersons,
}))
vi.mock('../../../../scripts/seed/obo-professional-verification.js', () => ({
  seedOboProfessionalVerificationFixtures: mocks.seedOboProfessionalVerificationFixtures,
  verifyOboProfessionalVerificationFixtures: mocks.verifyOboProfessionalVerificationFixtures,
}))
vi.mock('../../../../scripts/seed-model-coverage.js', () => ({
  seedModelCoverage: mocks.seedModelCoverage,
}))

const { PROFILES, runSeed } = await import('../../../../scripts/seed/index.js')

const applications = { obo: { id: 'app-obo', key: 'obo' } }
const roles = { admin: { id: 'role-admin', key: 'admin' } }
const permissionRecords = new Map([['users.read', { id: 'permission-1' }]])
const context = { applications, roles, permissionRecords }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.seedApplications.mockResolvedValue(applications)
  mocks.seedAuthorization.mockResolvedValue({ roles, permissionRecords })
  mocks.seedPlatformForms.mockResolvedValue({ form: { id: 'form-1', key: 'obo-building-plan-permit' } })
  mocks.seedDevelopmentUsers.mockResolvedValue({ demoPasswordHash: 'hash' })
})

describe('seed profiles', () => {
  it('defines the four supported profiles', () => {
    expect(PROFILES).toEqual(new Set(['default', 'development', 'fixtures', 'coverage']))
  })

  it('runs only required seeders for the default profile', async () => {
    const result = await runSeed({}, 'default')

    expect(result).toEqual(context)
    expect(mocks.seedApplications).toHaveBeenCalledTimes(1)
    expect(mocks.seedAuthorization).toHaveBeenCalledWith({}, { applications })
    expect(mocks.seedPlatformForms).toHaveBeenCalledTimes(1)
    expect(mocks.seedOboReferenceData).toHaveBeenCalledWith({}, {
      applicationForm: { id: 'form-1', key: 'obo-building-plan-permit' },
    })

    expect(mocks.seedDevelopmentUsers).not.toHaveBeenCalled()
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(mocks.seedOboPlatformConfiguration).not.toHaveBeenCalled()
    expect(mocks.bindOboDevelopmentForm).not.toHaveBeenCalled()
    expect(mocks.seedRolePersons).not.toHaveBeenCalled()
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()
    expect(mocks.seedOboNotifications).not.toHaveBeenCalled()
    expect(mocks.seedModelCoverage).not.toHaveBeenCalled()
  })

  it('adds development-only data only for the development profile', async () => {
    await runSeed({}, 'development')

    expect(mocks.seedDevelopmentUsers).toHaveBeenCalledWith({}, { roles })
    expect(mocks.seedOboDevelopmentScenario).toHaveBeenCalledWith({}, {
      roles,
      passwordHash: 'hash',
    })
    expect(mocks.seedOboPlatformConfiguration).toHaveBeenCalledTimes(1)
    expect(mocks.bindOboDevelopmentForm).toHaveBeenCalledTimes(1)
    expect(mocks.seedRolePersons).toHaveBeenCalledTimes(1)
    expect(mocks.verifyOboPlatformConfiguration).toHaveBeenCalledTimes(1)
    expect(mocks.verifyOboDevelopmentScenario).toHaveBeenCalledTimes(1)

    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()
    expect(mocks.seedOboNotifications).not.toHaveBeenCalled()
    expect(mocks.seedModelCoverage).not.toHaveBeenCalled()
  })

  it('adds specialized fixtures only for the fixtures profile', async () => {
    await runSeed({}, 'fixtures')

    expect(mocks.seedOboProfessionalVerificationFixtures).toHaveBeenCalledWith({}, {
      roles,
      passwordHash: null,
    })
    expect(mocks.seedOboNotifications).toHaveBeenCalledTimes(1)
    expect(mocks.verifyOboProfessionalVerificationFixtures).toHaveBeenCalledTimes(1)

    expect(mocks.seedDevelopmentUsers).not.toHaveBeenCalled()
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(mocks.seedOboPlatformConfiguration).not.toHaveBeenCalled()
    expect(mocks.bindOboDevelopmentForm).not.toHaveBeenCalled()
    expect(mocks.seedRolePersons).not.toHaveBeenCalled()
    expect(mocks.seedModelCoverage).not.toHaveBeenCalled()
  })

  it('runs model coverage only for the coverage profile', async () => {
    await runSeed({}, 'coverage')

    expect(mocks.seedModelCoverage).toHaveBeenCalledTimes(1)
    expect(mocks.seedDevelopmentUsers).not.toHaveBeenCalled()
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()
    expect(mocks.seedOboNotifications).not.toHaveBeenCalled()
  })

  it('is safe to invoke the same profile repeatedly', async () => {
    await runSeed({}, 'default')
    await runSeed({}, 'default')

    expect(mocks.seedApplications).toHaveBeenCalledTimes(2)
    expect(mocks.seedAuthorization).toHaveBeenCalledTimes(2)
    expect(mocks.seedPlatformForms).toHaveBeenCalledTimes(2)
    expect(mocks.seedOboReferenceData).toHaveBeenCalledTimes(2)
    expect(mocks.seedOboDevelopmentScenario).not.toHaveBeenCalled()
    expect(mocks.seedOboProfessionalVerificationFixtures).not.toHaveBeenCalled()
    expect(mocks.seedModelCoverage).not.toHaveBeenCalled()
  })

  it('rejects unsupported profiles before seeding anything', async () => {
    await expect(runSeed({}, 'unknown')).rejects.toThrow(
      "Unknown seed profile 'unknown'. Expected one of: default, development, fixtures, coverage.",
    )

    expect(mocks.seedApplications).not.toHaveBeenCalled()
  })
})
