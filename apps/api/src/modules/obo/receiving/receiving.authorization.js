import * as taskService from '../../../features/tasks/tasks.service.js'

const RECEIVING_TASK_TYPES = new Set([
  'REVIEW_APPLICATION',
  'RECEIVE_HARD_COPY',
  'VERIFY_DOCUMENTS',
  'EVALUATE_APPLICATION',
])

const hasReceivingTaskAccess = async ({ user, resource }) => {
  if (!user?.id || !resource?.caseId || !resource?.id) return false

  const tasks = await taskService.list(
    { caseId: resource.caseId, status: 'OPEN' },
    {},
  )

  const applicationTasks = tasks.filter((task) => {
    const metadata = task.metadata || {}
    return metadata.applicationId === resource.id && RECEIVING_TASK_TYPES.has(metadata.taskType)
  })

  if (applicationTasks.length === 0) return false

  // Unassigned applications remain in the Receiving Officer queue. Once a
  // task is assigned, only that assignee may access the application.
  return applicationTasks.some(
    (task) => task.assigneeUserId === null || Number(task.assigneeUserId) === Number(user.id),
  )
}

export { RECEIVING_TASK_TYPES, hasReceivingTaskAccess }
