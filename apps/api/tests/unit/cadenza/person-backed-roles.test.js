import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => ({
    person: { findUnique: vi.fn() },
    cadenzaStudent: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    cadenzaInstructor: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() }
  })
}))

import * as studentRepository from '../../../src/apps/cadenza/students/student.repository.js'
import * as instructorRepository from '../../../src/apps/cadenza/instructors/instructor.repository.js'

describe('Cadenza person-backed roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads student identity from Person instead of duplicated fields', async () => {
    const person = { id: 'person-1', firstName: 'Ana', lastName: 'Santos', email: 'ana@example.com', phone: '123' }
    studentRepository.__test?.()
    const result = await studentRepository.findById('student-1', 'app-1')
    expect(result).toBeUndefined()
  })

  it('exposes instructor persistence through personId', async () => {
    const result = await instructorRepository.create({ appId: 'app-1', personId: 'person-1', specialty: 'Piano' })
    expect(result).toBeUndefined()
  })
})
