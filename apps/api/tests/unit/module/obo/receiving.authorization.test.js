import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/features/tasks/tasks.service.js', () => ({
  list: vi.fn(),
}))

const taskService = await import('../../../../src/features/tasks/tasks.service.js')
const { hasReceivingTaskAccess } = await import('../../../../src/modules/obo/receiving/receiving.authorization.js')

describe('OBO receiving task authorization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows a receiving officer to access an application with an unassigned receiving task', async () => {
    taskService.list.mockResolvedValue([
      { id: 'task-1', assigneeUserId: null, metadata: { applicationId: 'app-1', taskType: 'RECEIVE_HARD_COPY' } },
    ])

    await expect(hasReceivingTaskAccess({ user: { id: 10 }, resource: { id: 'app-1', caseId: 'case-1' } })).resolves.toBe(true)
  })

  it('allows only the assignee when the receiving task is assigned', async () => {
    taskService.list.mockResolvedValue([
      { id: 'task-1', assigneeUserId: 10, metadata: { applicationId: 'app-1', taskType: 'VERIFY_DOCUMENTS' } },
    ])

    await expect(hasReceivingTaskAccess({ user: { id: 10 }, resource: { id: 'app-1', caseId: 'case-1' } })).resolves.toBe(true)
    await expect(hasReceivingTaskAccess({ user: { id: 11 }, resource: { id: 'app-1', caseId: 'case-1' } })).resolves.toBe(false)
  })

  it('rejects applications without an open receiving task', async () => {
    taskService.list.mockResolvedValue([
      { id: 'task-1', assigneeUserId: null, metadata: { applicationId: 'app-2', taskType: 'RECEIVE_HARD_COPY' } },
    ])

    await expect(hasReceivingTaskAccess({ user: { id: 10 }, resource: { id: 'app-1', caseId: 'case-1' } })).resolves.toBe(false)
  })

  it('ignores unrelated task types', async () => {
    taskService.list.mockResolvedValue([
      { id: 'task-1', assigneeUserId: null, metadata: { applicationId: 'app-1', taskType: 'UNRELATED_TASK' } },
    ])

    await expect(hasReceivingTaskAccess({ user: { id: 10 }, resource: { id: 'app-1', caseId: 'case-1' } })).resolves.toBe(false)
  })
})
