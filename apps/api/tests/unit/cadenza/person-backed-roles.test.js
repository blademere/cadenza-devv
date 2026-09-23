import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/customers/customer.repository.js', () => ({
  findByPersonId: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../../../src/features/people/people.service.js', () => ({
  getById: vi.fn(),
  getByUserId: vi.fn(),
}))

vi.mock('../../../src/apps/cadenza/instructors/instructor.repository.js', () => ({
  personExists: vi.fn(),
  findEligiblePerson: vi.fn(),
  findById: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

const customerRepository = await import('../../../src/apps/cadenza/customers/customer.repository.js')
const peopleService = await import('../../../src/features/people/people.service.js')
const instructorRepository = await import('../../../src/apps/cadenza/instructors/instructor.repository.js')
const customerService = await import('../../../src/apps/cadenza/customers/customer.service.js')
const instructorService = await import('../../../src/apps/cadenza/instructors/instructor.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const PERSON_ID = '550e8400-e29b-41d4-a716-446655440001'
const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440002'
const INSTRUCTOR_ID = '550e8400-e29b-41d4-a716-446655440003'

describe('Cadenza person-backed roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a customer by Person reference and does not accept duplicated identity fields', async () => {
    peopleService.getById.mockResolvedValue({ id: PERSON_ID, userId: 42, isActive: true })
    customerRepository.findByPersonId.mockResolvedValue(null)
    customerRepository.create.mockResolvedValue({
      id: CUSTOMER_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      status: 'ACTIVE',
      person: { id: PERSON_ID, firstName: 'Ana', lastName: 'Santos', email: 'ana@example.com' },
    })

    const result = await customerService.create({ appId: APP_ID, personId: PERSON_ID, actorId: 42 })

    expect(result.personId).toBe(PERSON_ID)
    expect(customerRepository.create).toHaveBeenCalledWith({ appId: APP_ID, personId: PERSON_ID })
    expect(customerRepository.create.mock.calls[0][0]).not.toHaveProperty('firstName')
    expect(customerRepository.create.mock.calls[0][0]).not.toHaveProperty('lastName')
    expect(customerRepository.create.mock.calls[0][0]).not.toHaveProperty('email')
    expect(customerRepository.create.mock.calls[0][0]).not.toHaveProperty('phone')
  })

  it('loads customer identity through the Person relation', async () => {
    const person = { id: PERSON_ID, firstName: 'Ana', lastName: 'Santos', email: 'ana@example.com', phone: '123' }
    customerRepository.findById.mockResolvedValue({
      id: CUSTOMER_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      status: 'ACTIVE',
      person: { ...person, userId: 42 },
    })
    peopleService.getById.mockResolvedValue({ ...person, userId: 42, isActive: true })

    const result = await customerService.get({ appId: APP_ID, id: CUSTOMER_ID, actorId: 42 })

    expect(result.person).toMatchObject(person)
    expect(result).not.toHaveProperty('firstName')
    expect(result).not.toHaveProperty('lastName')
  })

  it('creates an instructor by Person reference and preserves the specialty as app-specific data', async () => {
    instructorRepository.findEligiblePerson.mockResolvedValue({ id: PERSON_ID, userId: 42 })
    instructorRepository.personExists.mockResolvedValue(true)
    instructorRepository.create.mockResolvedValue({
      id: INSTRUCTOR_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      specialty: 'Piano',
      status: 'ACTIVE',
    })

    const result = await instructorService.create({
      appId: APP_ID,
      personId: PERSON_ID,
      specialty: ' Piano ',
    })

    expect(result).toMatchObject({ personId: PERSON_ID, specialty: 'Piano' })
    expect(instructorRepository.create).toHaveBeenCalledWith({
      appId: APP_ID,
      personId: PERSON_ID,
      specialty: 'Piano',
    })
  })

  it('rejects duplicate Person roles within the same Cadenza app', async () => {
    instructorRepository.findEligiblePerson.mockResolvedValue({ id: PERSON_ID, userId: 42 })
    instructorRepository.personExists.mockResolvedValue(true)
    instructorRepository.create.mockRejectedValue({ code: 'P2002' })

    await expect(instructorService.create({
      appId: APP_ID,
      personId: PERSON_ID,
      specialty: 'Piano',
    })).rejects.toThrow('already registered as an instructor')

    expect(instructorRepository.create).toHaveBeenCalledTimes(1)
  })
})
