import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seedPlatform: vi.fn(),
  seedObo: vi.fn(),
  seedCadenza: vi.fn(),
  seedModelCoverage: vi.fn(),
}))

vi.mock('../../../../scripts/seed/platform.js', () => ({ seedPlatform: mocks.seedPlatform }))
vi.mock('../../../../scripts/seed/apps/obo.js', () => ({ seedObo: mocks.seedObo }))
vi.mock('../../../../scripts/seed/apps/cadenza.js', () => ({ seedCadenza: mocks.seedCadenza }))
vi.mock('../../../../scripts/seed-model-coverage.js', () => ({ seedModelCoverage: mocks.seedModelCoverage }))

const { APPS, PROFILES, runSeed } = await import('../../../../scripts/seed/index.js')

const obo = { application: { id: 'app-obo', key: 'obo' }, roles: { client: { id: 'role-client' } }, permissionRecords: new Map([['obo_clients:read', { id: 'permission-1' }]]) }
const cadenza = { application: { id: 'app-cadenza', key: 'cadenza' }, roles: { cadenza_client: { id: 'role-client' } }, permissionRecords: new Map([['cadenza_lessons:read', { id: 'permission-2' }]]) }
const platform = { permissionRecords: new Map([['audit_logs:read', { id: 'permission-audit' }]]) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.seedPlatform.mockResolvedValue(platform)
  mocks.seedObo.mockResolvedValue(obo)
  mocks.seedCadenza.mockResolvedValue(cadenza)
})

describe('seed dispatcher', () => {
  it('defines explicit seed targets', () => {
    expect(PROFILES).toEqual(new Set(['default', 'development', 'fixtures', 'coverage']))
    expect(APPS).toEqual(new Set(['platform', 'obo', 'cadenza', 'all', 'coverage']))
  })

  it('seeds only platform data for the default seed target', async () => {
    const result = await runSeed({}, 'default', 'platform')

    expect(result.applications).toEqual({})
    expect(mocks.seedPlatform).toHaveBeenCalledTimes(1)
    expect(mocks.seedObo).not.toHaveBeenCalled()
    expect(mocks.seedCadenza).not.toHaveBeenCalled()
    expect(mocks.seedModelCoverage).not.toHaveBeenCalled()
  })

  it('seeds only OBO when the OBO target is selected', async () => {
    const result = await runSeed({}, 'development', 'obo')

    expect(result.applications.obo).toEqual(obo.application)
    expect(result.roles).toEqual(obo.roles)
    expect(mocks.seedObo).toHaveBeenCalledWith({}, { profile: 'development' })
    expect(mocks.seedCadenza).not.toHaveBeenCalled()
  })

  it('seeds only Cadenza when the Cadenza target is selected', async () => {
    const result = await runSeed({}, 'development', 'cadenza')

    expect(result.applications.cadenza).toEqual(cadenza.application)
    expect(result.roles).toEqual(cadenza.roles)
    expect(mocks.seedCadenza).toHaveBeenCalledWith({}, { profile: 'development' })
    expect(mocks.seedObo).not.toHaveBeenCalled()
  })

  it('seeds platform plus both applications for the all target', async () => {
    const result = await runSeed({}, 'development', 'all')

    expect(mocks.seedPlatform).toHaveBeenCalledTimes(1)
    expect(mocks.seedObo).toHaveBeenCalledWith({}, { profile: 'development' })
    expect(mocks.seedCadenza).toHaveBeenCalledWith({}, { profile: 'development' })
    expect(result.applications).toEqual({ obo: obo.application, cadenza: cadenza.application })
    expect(result.permissionRecords.size).toBe(3)
  })

  it('keeps model coverage isolated from application seed data', async () => {
    const result = await runSeed({}, 'coverage', 'coverage')

    expect(mocks.seedModelCoverage).toHaveBeenCalledTimes(1)
    expect(mocks.seedPlatform).not.toHaveBeenCalled()
    expect(mocks.seedObo).not.toHaveBeenCalled()
    expect(mocks.seedCadenza).not.toHaveBeenCalled()
    expect(result.applications).toEqual({})
  })

  it('rejects unsupported targets before seeding anything', async () => {
    await expect(runSeed({}, 'default', 'unknown')).rejects.toThrow(
      "Unknown seed app 'unknown'. Expected one of: platform, obo, cadenza, all, coverage.",
    )

    expect(mocks.seedPlatform).not.toHaveBeenCalled()
    expect(mocks.seedObo).not.toHaveBeenCalled()
    expect(mocks.seedCadenza).not.toHaveBeenCalled()
  })
})
