const workflowService = require("./workflow.service")
const workflowVersionService = require("./workflow-version.service")

module.exports = {
  ...workflowService,
  ...workflowVersionService,
}
