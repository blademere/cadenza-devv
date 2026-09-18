import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/cadenza/students/student.repository.js', () => ({
  personExists: vi.fn(),
  findById: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../../../src/apps/cadenza/instructors/instructor.repository.js', () => ({
  personExists: vi.fn(),
  findById: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

const studentRepository = await import('../../../src/apps/cadenza/students/student.repository.js')
const instructorRepository = await import('../../../src/apps/cadenza/instructors/instructor.repository.js')
const studentService = await import('../../../src/apps/cadenza/students/student.service.js')
const instructorService = await import('../../../src/apps/cadenza/instructors/instructor.service.js')

const APP_ID = '550e8400-e29b-41d4-a716-446655440000'
const PERSON_ID = '550e8400-e29b-41d4-a716-446655440001'
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const INSTRUCTOR_ID = '550e8400-e29b-41d4-a716-446655440003'

describe('Cadenza person-backed roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a student by Person reference and does not accept duplicated identity fields', async () => {
    studentRepository.personExists.mockResolvedValue(true)
    studentRepository.create.mockResolvedValue({
      id: STUDENT_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      status: 'ACTIVE',
      person: { id: PERSON_ID, firstName: 'Ana', lastName: 'Santos', email: 'ana@example.com' },
    })

    const result = await studentService.create({ appId: APP_ID, personId: PERSON_ID })

    expect(result.personId).toBe(PERSON_ID)
    expect(studentRepository.create).toHaveBeenCalledWith({ appId: APP_ID, personId: PERSON_ID })
    expect(studentRepository.create.mock.calls[0][0]).not.toHaveProperty('firstName')
    expect(studentRepository.create.mock.calls[0][0]).not.toHaveProperty('lastName')
    expect(studentRepository.create.mock.calls[0][0]).not.toHaveProperty('email')
    expect(studentRepository.create.mock.calls[0][0]).not.toHaveProperty('phone')
  })

  it('rejects a student when the referenced Person does not exist', async () => {
    studentRepository.personExists.mockResolvedValue(false)

    await expect(studentService.create({ appId: APP_ID, personId: PERSON_ID }))
      .rejects.toThrow('Person not found.')
    expect(studentRepository.create).not.toHaveBeenCalled()
  })

  it('loads student identity through the Person relation', async () => {
    const person = { id: PERSON_ID, firstName: 'Ana', lastName: 'Santos', email: 'ana@example.com', phone: '123' }
    studentRepository.findById.mockResolvedValue({
      id: STUDENT_ID,
      appId: APP_ID,
      personId: PERSON_ID,
      status: 'ACTIVE',
      person,
    })

    const result = await studentService.get({ appId: APP_ID, id: STUDENT_ID })

    expect(result.person).toEqual(person)
    expect(result).not.toHaveProperty('firstName')
    expect(result).not.toHaveProperty('lastName')
  })

  it('creates an instructor by Person reference and preserves the specialty as app-specific data', async () => {
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
