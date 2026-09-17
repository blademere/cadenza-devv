import * as taskService from '../../../features/tasks/tasks.service.js'

const RECEIVING_TASK_TYPES = new Set([
  'REVIEW_APPLICATION',
  'RECEIVE_HARD_COPY',
  'VERIFY_DOCUMENTS',
  'EVALUATE_APPLICATION',
])

const hasReceivingTaskAccess = async ({ user, resource }) => {
  if (!user?.id || !resource?.caseId || !resource?.id || !resource?.appId) return false

  const tasks = await taskService.list(
    { caseId: resource.caseId, status: 'OPEN' },
    { appId: resource.appId },
  )

  const applicationTasks = tasks.filter((task) => {
    const metadata = task.metadata || {}
    return metadata.applicationId === resource.id && RECEIVING_TASK_TYPES.has(metadata.taskType)
  })

  if (applicationTasks.length === 0) return false

  return applicationTasks.some(
    (task) => task.assigneeUserId === null || Number(task.assigneeUserId) === Number(user.id),
  )
}

export { RECEIVING_TASK_TYPES, hasReceivingTaskAccess }
