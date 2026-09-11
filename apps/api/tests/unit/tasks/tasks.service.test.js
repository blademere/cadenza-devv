import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/tasks/tasks.repository.js')

const repository = await import('../../../src/features/tasks/tasks.repository.js')
const { create, update } = await import('../../../src/features/tasks/tasks.service.js')
const spies = { createTask: repository.createTask, findTaskById: repository.findTaskById, findCase: repository.findCase, updateTask: repository.updateTask }

afterEach(() => vi.clearAllMocks())

describe('tasks service', () => {
  it('normalizes task titles on create', async () => {
    spies.createTask.mockImplementation(async (data) => ({ id: 'task-1', ...data }))
    await expect(create({ title: ' Review application ' })).resolves.toMatchObject({ title: 'Review application' })
  })
  it('rejects a task with a missing case', async () => {
    spies.findCase.mockResolvedValue(null)
    await expect(create({ title: 'Review', caseId: 'missing' })).rejects.toThrow('Case not found.')
  })
  it('sets completedAt when a task becomes done', async () => {
    spies.findTaskById.mockResolvedValue({ id: 'task-1', status: 'OPEN' })
    spies.updateTask.mockImplementation(async (id, data) => ({ id, ...data }))
    await expect(update('task-1', { status: 'DONE' })).resolves.toMatchObject({ id: 'task-1', status: 'DONE' })
    expect(spies.updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ completedAt: expect.any(Date) }), undefined)
  })
  it('clears completedAt when a done task is reopened', async () => {
    spies.findTaskById.mockResolvedValue({ id: 'task-1', status: 'DONE', completedAt: new Date() })
    spies.updateTask.mockImplementation(async (id, data) => ({ id, ...data }))
    await update('task-1', { status: 'OPEN' })
    expect(spies.updateTask).toHaveBeenCalledWith('task-1', { status: 'OPEN', completedAt: null }, undefined)
  })
})
