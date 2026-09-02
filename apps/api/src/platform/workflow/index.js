import * as workflowService from './workflow.service.js'
import * as workflowVersionService from './workflow-version.service.js'

export {
  ...workflowService,
  ...workflowVersionService,
}
