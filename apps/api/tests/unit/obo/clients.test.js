import { beforeEach, describe, expect, it, vi } from 'vitest'

const peopleMocks = vi.hoisted(() => ({ create: vi.fn(), getByUserId: vi.fn(), update: vi.fn() }))
vi.mock('../../../src/features/people/people.service.js', () => ({ ...peopleMocks, default: peopleMocks }))

const peopleService = peopleMocks
const clientService = await import('../../../src/modules/obo/clients/client.service.js')
const { registrationValidator } = await import('../../../src/modules/obo/clients/client.validation.js')

beforeEach(() => vi.clearAllMocks())

describe('OBO client profile workflow', () => {
  it('creates a person profile for the authenticated user', async () => {
    peopleService.create.mockResolvedValue({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })
    await expect(clientService.createProfile({ userId: 42, firstName: ' Juan ', lastName: 'Cruz', phone: '09171234567' })).resolves.toEqual({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })
    expect(peopleService.create).toHaveBeenCalledWith({ userId: 42, firstName: ' Juan ', lastName: 'Cruz', phone: '09171234567' })
  })
  it('maps a concurrent userId unique violation to conflict', async () => {
    peopleService.create.mockRejectedValue({ code: 'P2002', meta: { target: ['userId'] } })
    await expect(clientService.createProfile({ userId: 42, firstName: 'Juan', lastName: 'Cruz' })).rejects.toThrow('An OBO client profile already exists for this account.')
  })
  it('retrieves the authenticated user client profile through People service', async () => {
    peopleService.getByUserId.mockResolvedValue({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })
    await expect(clientService.getProfile({ userId: 42 })).resolves.toEqual({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })
    expect(peopleService.getByUserId).toHaveBeenCalledWith(42)
  })
  it('updates the authenticated user client profile through People service', async () => {
    peopleService.getByUserId.mockResolvedValue({ id: 'person-1', userId: 42 })
    peopleService.update.mockResolvedValue({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })
    await expect(clientService.updateProfile({ userId: 42, firstName: 'Juan' })).resolves.toMatchObject({ id: 'person-1', firstName: 'Juan' })
    expect(peopleService.getByUserId).toHaveBeenCalledWith(42)
    expect(peopleService.update).toHaveBeenCalledWith('person-1', { firstName: 'Juan' })
  })
})

describe('OBO client registration validation', () => {
  it('accepts a valid client profile', async () => {
    const result = await registrationValidator({ body: { firstName: 'Juan', middleName: 'Dela', lastName: 'Cruz', suffix: null, email: 'CLIENT@example.com', phone: '09171234567', address: { barangay: 'Poblacion', city: 'Dipolog' } } })
    expect(result.body).toMatchObject({ firstName: 'Juan', lastName: 'Cruz', email: 'client@example.com' })
  })
  it('rejects missing required names', async () => { await expect(registrationValidator({ body: { firstName: 'Juan' } })).rejects.toThrow() })
  it('rejects client-controlled ownership fields', async () => { await expect(registrationValidator({ body: { firstName: 'Juan', lastName: 'Cruz', userId: 42 } })).rejects.toThrow() })
})
