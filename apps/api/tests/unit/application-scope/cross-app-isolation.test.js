import { describe, expect, it, vi } from 'vitest'

const makeScopedDb = ({ model, record, matches }) => ({
  [model]: {
    findFirst: vi.fn(async ({ where }) => (matches(where) && (!record?.appId || record.appId === where?.appId) ? record : null)),
    findMany: vi.fn(async ({ where }) => (matches(where) && (!record?.appId || record.appId === where?.appId) ? [record] : [])),
    updateMany: vi.fn(async ({ where }) => ({ count: matches(where) && (!record?.appId || record.appId === where?.appId) ? 1 : 0 })),
    create: vi.fn(async ({ data }) => ({ ...record, ...data })),
  },
})

const appScopedMatch = (where, appId) => where?.appId === appId
const nestedAppScopedMatch = (where, appId, relation) => where?.[relation]?.appId === appId
const adminRecord = (appId = 'admin-app') => ({ id: 'shared-id', appId })

describe('cross-application isolation contracts', () => {
  it('cases: an OBO lookup cannot resolve an Admin case', async () => {
    const db = makeScopedDb({ model: 'caseRecord', record: adminRecord(), matches: (where) => appScopedMatch(where, 'obo-app') })
    const { findCaseById } = await import('../../../src/features/cases/cases.repository.js')

    await expect(findCaseById('shared-id', { appId: 'obo-app', db })).resolves.toBeNull()
    expect(db.caseRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'shared-id', appId: 'obo-app' } }))
  })

  it('tasks: an OBO lookup cannot resolve an Admin task', async () => {
    const db = makeScopedDb({ model: 'task', record: adminRecord(), matches: (where) => appScopedMatch(where, 'obo-app') })
    const { findTaskById } = await import('../../../src/features/tasks/tasks.repository.js')

    await expect(findTaskById('shared-id', 'obo-app', db)).resolves.toBeNull()
    expect(db.task.findFirst).toHaveBeenCalledWith({ where: { id: 'shared-id', appId: 'obo-app' } })
  })

  it('requirements: case requirements are scoped through the owning case', async () => {
    const db = makeScopedDb({ model: 'caseRequirement', record: { id: 'cr-1', caseId: 'case-1' }, matches: (where) => nestedAppScopedMatch(where, 'obo-app', 'caseRecord') })
    const { findCaseRequirement } = await import('../../../src/features/requirements/requirements.repository.js')

    await expect(findCaseRequirement('case-1', 'req-1', 'obo-app', db)).resolves.toEqual({ id: 'cr-1', caseId: 'case-1' })
    expect(db.caseRequirement.findFirst).toHaveBeenCalledWith({
      where: { caseId: 'case-1', requirementId: 'req-1', caseRecord: { appId: 'obo-app' } },
    })

    db.caseRequirement.findFirst.mockImplementationOnce(async ({ where }) =>
      nestedAppScopedMatch(where, 'admin-app', 'caseRecord') ? { id: 'cr-admin' } : null,
    )
    await expect(findCaseRequirement('case-1', 'req-1', 'obo-app', db)).resolves.toBeNull()
  })

  it('participants: case participants inherit application ownership from the case', async () => {
    const db = makeScopedDb({ model: 'caseParticipant', record: { id: 'participant-1' }, matches: (where) => nestedAppScopedMatch(where, 'obo-app', 'caseRecord') })
    const { findParticipant, removeParticipant } = await import('../../../src/features/participants/participants.repository.js')

    await expect(findParticipant('case-1', 'person-1', 'APPLICANT', 'obo-app', db)).resolves.toEqual({ id: 'participant-1' })
    expect(db.caseParticipant.findFirst).toHaveBeenCalledWith({
      where: { caseId: 'case-1', personId: 'person-1', roleKey: 'APPLICANT', caseRecord: { appId: 'obo-app' } },
    })

    await expect(removeParticipant('participant-1', 'admin-app', db)).resolves.toBeNull()
    expect(db.caseParticipant.findFirst).toHaveBeenLastCalledWith({
      where: { id: 'participant-1', caseRecord: { appId: 'admin-app' } },
      select: { id: true },
    })
  })

  it('appointments: appointment types and appointments are application-scoped', async () => {
    const typeDb = makeScopedDb({ model: 'appointmentType', record: adminRecord(), matches: (where) => appScopedMatch(where, 'obo-app') })
    const appointmentDb = makeScopedDb({ model: 'appointment', record: adminRecord(), matches: (where) => appScopedMatch(where, 'obo-app') })
    const { findAppointmentType, findAppointment } = await import('../../../src/features/appointments/appointment.repository.js')

    await expect(findAppointmentType('shared-id', 'obo-app', typeDb)).resolves.toBeNull()
    await expect(findAppointment('shared-id', 'obo-app', appointmentDb)).resolves.toBeNull()
    expect(typeDb.appointmentType.findFirst).toHaveBeenCalledWith({ where: { id: 'shared-id', appId: 'obo-app' } })
    expect(appointmentDb.appointment.findFirst).toHaveBeenCalledWith({ where: { id: 'shared-id', appId: 'obo-app' } })
  })

  it('forms: versions are scoped through the owning form', async () => {
    const db = makeScopedDb({ model: 'formVersion', record: { id: 'version-1', formId: 'form-1' }, matches: (where) => nestedAppScopedMatch(where, 'obo-app', 'form') })
    const { findVersionById } = await import('../../../src/platform/forms/form.repository.js')

    await expect(findVersionById('version-1', 'obo-app', db)).resolves.toEqual({ id: 'version-1', formId: 'form-1' })
    expect(db.formVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'version-1', form: { appId: 'obo-app' } },
    }))
  })

  it('documents: an application cannot resolve another application document', async () => {
    const db = {
      document: {
        findFirst: vi.fn(async ({ where }) => (where.OR?.some((entry) => entry.appId === 'admin-app') ? { id: 'doc-1', appId: 'admin-app' } : null)),
      },
    }
    const { findOwnedDocument } = await import('../../../src/features/documents/document.repository.js')

    await expect(findOwnedDocument({ userId: 'user-1', id: 'doc-1', appId: 'obo-app' }, db)).resolves.toBeNull()
    expect(db.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        ownerId: 'user-1',
        deletedAt: null,
        OR: [{ appId: 'obo-app' }, { appId: null }],
      },
    })
  })

  it('documents: explicitly shared documents remain accessible to an application', async () => {
    const db = {
      document: {
        findFirst: vi.fn(async ({ where }) => (where.OR?.some((entry) => entry.appId === null) ? { id: 'doc-shared', appId: null } : null)),
      },
    }
    const { findOwnedDocument } = await import('../../../src/features/documents/document.repository.js')

    await expect(findOwnedDocument({ userId: 'user-1', id: 'doc-shared', appId: 'obo-app' }, db)).resolves.toEqual({ id: 'doc-shared', appId: null })
  })

  it('audit: application context is persisted with audit records', async () => {
    vi.resetModules()
    vi.doMock('../../../src/platform/context/context.service.js', () => ({
      getContext: () => ({ appId: 'obo-app', actorId: 'user-1' }),
    }))
    vi.doMock('../../../src/platform/audit/audit.repository.js', () => ({
      createAuditLog: vi.fn(async (data) => data),
    }))

    const { recordAudit } = await import('../../../src/platform/audit/audit.service.js')
    const result = await recordAudit({ action: 'CASE_READ', entityType: 'Case', entityId: 'case-1' })

    expect(result).toEqual(expect.objectContaining({ appId: 'obo-app', actorId: 'user-1', entityId: 'case-1' }))
  })
})
