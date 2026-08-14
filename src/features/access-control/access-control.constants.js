const ACCESS_CONTROL_MODULES = Object.freeze({
  USERS: "users",
  APPLICATIONS: "applications",
  DOCUMENTS: "documents",
  INSPECTIONS: "inspections",
  REPORTS: "reports",
})

const ACCESS_CONTROL_ACTIONS = Object.freeze({
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",

  REVIEW: "review",
  RECEIVE: "receive",
  APPROVE: "approve",
  REJECT: "reject",

  UPLOAD: "upload",
})

const ACCESS_CONTROL_PERMISSION_KEYS = Object.freeze({
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  APPLICATIONS_READ: "applications.read",
  APPLICATIONS_CREATE: "applications.create",
  APPLICATIONS_UPDATE: "applications.update",
  APPLICATIONS_DELETE: "applications.delete",
  APPLICATIONS_REVIEW: "applications.review",
  APPLICATIONS_RECEIVE: "applications.receive",
  APPLICATIONS_APPROVE: "applications.approve",
  APPLICATIONS_REJECT: "applications.reject",

  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_DELETE: "documents.delete",

  INSPECTIONS_READ: "inspections.read",
  INSPECTIONS_CREATE: "inspections.create",
  INSPECTIONS_UPDATE: "inspections.update",

  REPORTS_READ: "reports.read",
})

module.exports = {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
  ACCESS_CONTROL_PERMISSION_KEYS,
}
