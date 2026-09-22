import { ConflictError } from '../../../common/errors/appError.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'

const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) {
    throw new ConflictError('Permit application is not attached to a workflow instance.')
  }

  try {
    return await workflowService.getWorkflowInstance(application.workflowInstanceId)
  } catch (error) {
    if (error?.code === 'NOT_FOUND' || error?.status === 404) {
      throw new ConflictError('Permit application workflow instance was not found.')
    }
    throw error
  }
}

const withWorkflowState = async (application) => {
  const workflow = await getWorkflowState(application)
  return {
    ...application,
    status: workflow.currentStep.key,
    workflowInstanceId: workflow.id,
  }
}

export { getWorkflowState, withWorkflowState }
