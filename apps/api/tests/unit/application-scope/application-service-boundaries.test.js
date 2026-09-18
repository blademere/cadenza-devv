import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '../../../src')

const read = (relativePath) => readFile(path.join(src, relativePath), 'utf8')

describe('application-scoped service boundaries', () => {
  it('requires appId at the shared case creation boundary', async () => {
    const source = await read('features/cases/cases.service.js')
    expect(source).toContain('const createRecord = async (data, { appId, db } = {})')
    expect(source).toContain("throw new BadRequestError('appId is required.')")
  })

  it('requires appId at the shared task creation boundary', async () => {
    const source = await read('features/tasks/tasks.service.js')
    expect(source).toContain('const create = async (data, { appId, db } = {})')
    expect(source).toContain("throw new BadRequestError('appId is required.')")
  })

  it('requires appId for participant application operations without accepting Express request objects', async () => {
    const source = await read('features/participants/participants.application.service.js')
    expect(source).toContain('const add = async ({')
    expect(source).toContain('const list = async ({ caseId, appId, db })')
    expect(source).toContain('const remove = async ({ id, appId, db })')
    expect(source).toContain('requireAppId(appId)')
    expect(source).not.toMatch(/\breq\b/)
  })

  it('requires explicit appId for the shared appointment service', async () => {
    const source = await read('features/appointments/appointment.service.js')
    expect(source).toContain("import { requireAppId } from '../../platform/applications/application-scope.js'")
    expect(source).toContain('repository.listAppointmentTypes({ appId: requireAppId(appId)')
    expect(source).toContain('const getAppointmentForReference = async ({ id, appId, db })')
    expect(source).toContain('const bookAppointment = async ({ userId, appId,')
    expect(source).not.toMatch(/\breq\b/)
  })

  it('requires explicit appId for the shared requirements service', async () => {
    const source = await read('features/requirements/requirements.service.js')
    expect(source).toContain('const requireAppId = (appId) =>')
    expect(source).toContain('const createRequirementDefinition = async (data, { appId, db } = {})')
    expect(source).toContain('const attachToCase = async ({ caseId, requirementId, dueAt, metadata, appId, db })')
    expect(source).not.toMatch(/\breq\b/)
  })

  it('requires explicit appId for the shared forms service', async () => {
    const source = await read('platform/forms/form.service.js')
    expect(source).toContain('const requireAppId = (appId) =>')
    expect(source).toContain('const createForm = async ({ appId,')
    expect(source).toContain('const getFormVersion = async ({ formKey, version, appId })')
    expect(source).toContain('const validateFormValues = async ({ formKey, version, values, requireRequired = true, appId })')
    expect(source).not.toMatch(/\breq\b/)
  })

  it('does not couple reusable services to Express request state', async () => {
    const sources = await Promise.all([
      read('features/cases/cases.service.js'),
      read('features/tasks/tasks.service.js'),
      read('features/participants/participants.application.service.js'),
      read('features/appointments/appointment.service.js'),
      read('features/requirements/requirements.service.js'),
      read('platform/forms/form.service.js'),
    ])
    for (const source of sources) expect(source).not.toMatch(/\breq\b/)
  })
})
