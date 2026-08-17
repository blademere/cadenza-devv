module.exports = {
  rules: require("./rules/rule.service"),
  approvals: require("./approvals/approval.service"),
  notifications: require("./notifications/notification.service"),
  sla: require("./sla/sla.service"),
}
