import { ConflictError } from '../../../common/errors/appError.js'
import * as repository from './plan-permit.repository.js'

const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) {
    throw new ConflictError('Permit application is not attached to a workflow instance.')
  }

  const workflow = await repository.findWorkflowInstance(application.workflowInstanceId)
  if (!workflow) {
    throw new ConflictError('Permit application workflow instance was not found.')
  }

  return workflow
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
