import * as taskService from '../../../features/tasks/tasks.service.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'

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

  if (applicationTasks.length > 0) {
    // Unassigned applications remain in the Receiving Officer queue. Once a
    // task is assigned, only that assignee may access the application.
    return applicationTasks.some(
      (task) => task.assigneeUserId === null || Number(task.assigneeUserId) === Number(user.id),
    )
  }

  // Applications created before the shared Receiving Task integration may not
  // have a RECEIVE_HARD_COPY task. Keep those scheduled applications visible
  // and accessible instead of silently hiding them from Receiving.
  if (resource.workflowInstanceId && resource.submissionAppointment) {
    const workflow = await workflowService.getWorkflowInstance(resource.workflowInstanceId)
    return workflow.currentStep?.key === 'SUBMISSION_SCHEDULED'
  }

  return false
}

export { RECEIVING_TASK_TYPES, hasReceivingTaskAccess }
