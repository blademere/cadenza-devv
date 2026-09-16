import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/tasks/tasks.repository.js')

const repository = await import('../../../src/features/tasks/tasks.repository.js')
const { create, getById, list, update } = await import('../../../src/features/tasks/tasks.service.js')
const spies = {
  createTask: repository.createTask,
  findTaskById: repository.findTaskById,
  findCase: repository.findCase,
  listTasks: repository.listTasks,
  updateTask: repository.updateTask,
}

const appId = 'app-obo'

afterEach(() => vi.clearAllMocks())

describe('task application ownership', () => {
  it('requires appId when creating a task', async () => {
    await expect(create({ title: 'Review' })).rejects.toThrow('appId is required.')
  })

  it('persists the application owner on create', async () => {
    spies.createTask.mockImplementation(async (data) => ({ id: 'task-1', ...data }))

    await expect(create({ title: ' Review application ' }, { appId })).resolves.toMatchObject({
      title: 'Review application',
      appId,
    })
    expect(spies.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Review application', appId }),
      undefined,
    )
  })

  it('rejects a task whose case is outside the application', async () => {
    spies.findCase.mockResolvedValue(null)

    await expect(
      create({ title: 'Review', caseId: 'case-other-app' }, { appId }),
    ).rejects.toThrow('Case not found.')
    expect(spies.findCase).toHaveBeenCalledWith('case-other-app', appId, undefined)
  })

  it('requires appId when reading a task', async () => {
    await expect(getById('task-1')).rejects.toThrow('appId is required.')
  })

  it('scopes reads and lists to the application', async () => {
    spies.findTaskById.mockResolvedValue({ id: 'task-1', appId })
    spies.listTasks.mockResolvedValue([])

    await getById('task-1', { appId })
    await list({ status: 'OPEN' }, { appId })

    expect(spies.findTaskById).toHaveBeenCalledWith('task-1', appId, undefined)
    expect(spies.listTasks).toHaveBeenCalledWith({ status: 'OPEN' }, appId, undefined)
  })
})

describe('task completion lifecycle', () => {
  it('sets completedAt when a task becomes done', async () => {
    spies.findTaskById.mockResolvedValue({ id: 'task-1', appId, status: 'OPEN' })
    spies.updateTask.mockResolvedValue({ count: 1 })

    await expect(update('task-1', { status: 'DONE' }, { appId })).resolves.toMatchObject({
      id: 'task-1',
      appId,
      status: 'OPEN',
    })
    expect(spies.updateTask).toHaveBeenCalledWith(
      'task-1',
      appId,
      expect.objectContaining({ completedAt: expect.any(Date) }),
      undefined,
    )
  })

  it('clears completedAt when a done task is reopened', async () => {
    spies.findTaskById
      .mockResolvedValueOnce({ id: 'task-1', appId, status: 'DONE', completedAt: new Date() })
      .mockResolvedValueOnce({ id: 'task-1', appId, status: 'OPEN', completedAt: null })
    spies.updateTask.mockResolvedValue({ count: 1 })

    await update('task-1', { status: 'OPEN' }, { appId })
    expect(spies.updateTask).toHaveBeenCalledWith(
      'task-1',
      appId,
      { status: 'OPEN', completedAt: null },
      undefined,
    )
  })

  it('rejects moving a task to a case owned by another application', async () => {
    spies.findTaskById.mockResolvedValue({ id: 'task-1', appId, status: 'OPEN' })
    spies.findCase.mockResolvedValue(null)

    await expect(
      update('task-1', { caseId: 'case-other-app' }, { appId }),
    ).rejects.toThrow('Case not found.')
    expect(spies.updateTask).not.toHaveBeenCalled()
  })
})
