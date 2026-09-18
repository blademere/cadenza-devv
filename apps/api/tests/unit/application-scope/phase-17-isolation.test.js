import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '../../../src')
const prisma = path.resolve(here, '../../../prisma')

const read = (relativePath) => readFile(path.join(src, relativePath), 'utf8')
const readPrisma = (relativePath) => readFile(path.join(prisma, relativePath), 'utf8')

const matrix = [
  {
    name: 'Cases',
    repository: 'features/cases/cases.repository.js',
    service: 'features/cases/cases.service.js',
    requiredRepositoryTokens: [
      'where: { id, appId }',
      'where: { ...(where || {}), appId }',
      'where: { id, appId, status: fromStatus }',
    ],
    requiredServiceTokens: ['appId', 'createRecord', 'getById', 'list', 'transition'],
  },
  {
    name: 'Tasks',
    repository: 'features/tasks/tasks.repository.js',
    service: 'features/tasks/tasks.service.js',
    requiredRepositoryTokens: [
      'where: { id, appId }',
      'where: { ...where, appId }',
      'where: { id, appId }',
    ],
    requiredServiceTokens: ['appId', 'create', 'getById', 'list', 'update'],
  },
  {
    name: 'Appointments',
    repository: 'features/appointments/appointment.repository.js',
    service: 'features/appointments/appointment.service.js',
    requiredRepositoryTokens: [
      'where: { id, appId }',
      'appointmentType: { appId }',
      'where: { userId, appId }',
    ],
    requiredServiceTokens: ['requireAppId', 'appId', 'listAppointmentTypes', 'bookAppointment'],
  },
  {
    name: 'Requirements',
    repository: 'features/requirements/requirements.repository.js',
    service: 'features/requirements/requirements.service.js',
    requiredRepositoryTokens: [
      'where: { id, appId }',
      'caseRecord: { appId }',
    ],
    requiredServiceTokens: ['requireAppId', 'appId', 'createRequirementDefinition', 'attachToCase'],
  },
  {
    name: 'Forms',
    repository: 'platform/forms/form.repository.js',
    service: 'platform/forms/form.service.js',
    requiredRepositoryTokens: [
      'where: { id, appId }',
      'where: { key, appId }',
      'form: { appId }',
    ],
    requiredServiceTokens: ['requireAppId', 'appId', 'createForm', 'getFormVersion', 'validateFormValues'],
  },
  {
    name: 'Documents',
    repository: 'features/documents/document.repository.js',
    service: 'features/documents/document.service.js',
    requiredRepositoryTokens: [
      "OR: [{ appId }, { appId: null }]",
      'appId = null',
      'appId',
    ],
    requiredServiceTokens: ['appId'],
  },
  {
    name: 'Participants',
    repository: 'features/participants/participants.repository.js',
    service: 'features/participants/participants.service.js',
    requiredRepositoryTokens: [
      'where: { id: data.caseId, appId }',
      'caseRecord: { appId }',
    ],
    requiredServiceTokens: ['requireAppId', 'appId', 'const add', 'const list', 'const remove'],
  },
  {
    name: 'Audit',
    repository: 'platform/audit/audit.repository.js',
    service: 'platform/audit/audit.service.js',
    requiredRepositoryTokens: ['auditLog.create({ data })'],
    requiredServiceTokens: ['const resolvedAppId = appId ?? context?.appId ?? null', 'appId: resolvedAppId'],
  },
]

describe('phase 17 application isolation matrix', () => {
  for (const entry of matrix) {
    it(`${entry.name}: repository operations carry application ownership`, async () => {
      const source = await read(entry.repository)
      for (const token of entry.requiredRepositoryTokens) {
        expect(source, `${entry.name} repository is missing ${token}`).toContain(token)
      }
    })

    it(`${entry.name}: service boundary carries application context without Express coupling`, async () => {
      const source = await read(entry.service)
      for (const token of entry.requiredServiceTokens) {
        expect(source, `${entry.name} service is missing ${token}`).toContain(token)
      }
      expect(source).not.toMatch(/\breq\.(?:appContext|security\.app)\b/)
    })
  }

  it('OBO permit applications remain scoped for read, client-owned read, create, and update', async () => {
    const source = await read('apps/obo/applications/applications.repository.js')
    expect(source).toContain('where: withAppId({ id }, appId)')
    expect(source).toContain('where: withAppId({ id, clientPersonId }, appId)')
    expect(source).toContain('const appId = requireAppId(data?.appId)')
    expect(source).toContain('where: withAppId({ id }, owner)')
  })

  it('participant ownership is inherited from the case rather than copied into a global participant record', async () => {
    const source = await read('features/participants/participants.repository.js')
    expect(source).toContain('caseRecord: { appId }')
    expect(source).not.toContain('participant.appId')
  })

  it('documents preserve the intentional shared-document escape hatch explicitly', async () => {
    const source = await read('features/documents/document.repository.js')
    expect(source).toContain("OR: [{ appId }, { appId: null }]")
    expect(source).toContain('deletedAt: null')
  })

  it('the Phase 13 unique constraints remain application-scoped', async () => {
    const migrations = [
      await readPrisma('migrations/20260916160000_scope_application_unique_constraints/migration.sql'),
      await readPrisma('migrations/20260916160000_scope_appointments_to_application/migration.sql'),
      await readPrisma('migrations/20260916170000_scope_requirements_to_application/migration.sql'),
      await readPrisma('migrations/20260916175000_scope_forms_to_application/migration.sql'),
    ].join('\n')
    const expectedIndexes = [
      'CaseRecord_appId_caseNumber_key',
      'Form_appId_key_key',
      'RequirementDefinition_appId_key_key',
      'AppointmentType_appId_key_key',
      'Appointment_appId_referenceNumber_key',
      'OboPermitType_appId_key_key',
      'OboPermitApplication_appId_referenceNumber_key',
      'OboProfessional_appId_personId_key',
      'OboProfessional_appId_registrationNumber_key',
      'OboProfessional_appId_prcId_key',
    ]
    for (const index of expectedIndexes) expect(migrations).toContain(index)
  })

  it('the application isolation matrix covers every Phase 17 target capability', () => {
    expect(matrix.map(({ name }) => name)).toEqual([
      'Cases',
      'Tasks',
      'Appointments',
      'Requirements',
      'Forms',
      'Documents',
      'Participants',
      'Audit',
    ])
  })
})
