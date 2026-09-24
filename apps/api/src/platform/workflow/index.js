import * as workflowService from './workflow.service.js'
import * as workflowVersionService from './workflow-version.service.js'

export const createWorkflow = workflowService.createWorkflow
export const startWorkflow = workflowService.startWorkflow
export const transitionWorkflow = workflowService.transitionWorkflow
export const getWorkflowInstance = workflowService.getWorkflowInstance
export const assertTransitionPermission = workflowService.assertTransitionPermission
export const assertWorkflowDefinition = workflowService.assertWorkflowDefinition
export const createWorkflowVersion = workflowVersionService.createWorkflowVersion
export const validateWorkflowVersion = workflowVersionService.validateWorkflowVersion
export const publishWorkflowVersion = workflowVersionService.publishWorkflowVersion
export const rollbackWorkflowVersion = workflowVersionService.rollbackWorkflowVersion
export const validateDefinition = workflowVersionService.validateDefinition
