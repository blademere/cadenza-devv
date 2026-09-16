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

  it('does not couple reusable case/task services to Express request state', async () => {
    const [cases, tasks] = await Promise.all([
      read('features/cases/cases.service.js'),
      read('features/tasks/tasks.service.js'),
    ])
    expect(cases).not.toMatch(/\breq\b/)
    expect(tasks).not.toMatch(/\breq\b/)
  })
})
