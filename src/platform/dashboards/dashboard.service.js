const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")

const createDashboard = async ({ key, name, description = null, config = null, widgets = [] }) => {
  if (!key || !name) throw new BadRequestError("Dashboard key and name are required.")
  if (await prisma.dashboard.findUnique({ where: { key } })) throw new ConflictError(`Dashboard '${key}' already exists.`)
  return prisma.dashboard.create({
    data: {
      key, name, description, config,
      widgets: { create: widgets.map((widget, index) => ({ key: widget.key, type: widget.type, title: widget.title, description: widget.description || null, sortOrder: widget.sortOrder ?? index, permissionKey: widget.permissionKey || null, config: widget.config || {} })) },
    },
    include: { widgets: { orderBy: { sortOrder: "asc" } } },
  })
}

const getDashboard = async (key) => {
  const dashboard = await prisma.dashboard.findUnique({ where: { key }, include: { widgets: { orderBy: { sortOrder: "asc" } } } })
  if (!dashboard || !dashboard.active) throw new NotFoundError(`Active dashboard '${key}' was not found.`)
  return dashboard
}

const getDashboardForPermissions = async ({ key, permissions = [] }) => {
  const dashboard = await getDashboard(key)
  const allowed = new Set(permissions)
  return { ...dashboard, widgets: dashboard.widgets.filter((widget) => !widget.permissionKey || allowed.has(widget.permissionKey)) }
}

const addWidget = async ({ dashboardKey, widget }) => {
  const dashboard = await prisma.dashboard.findUnique({ where: { key: dashboardKey } })
  if (!dashboard) throw new NotFoundError(`Dashboard '${dashboardKey}' was not found.`)
  if (!widget?.key || !widget?.type || !widget?.title) throw new BadRequestError("Widget key, type, and title are required.")
  return prisma.dashboardWidget.create({ data: { dashboardId: dashboard.id, key: widget.key, type: widget.type, title: widget.title, description: widget.description || null, sortOrder: widget.sortOrder ?? 0, permissionKey: widget.permissionKey || null, config: widget.config || {} } })
}

module.exports = { createDashboard, getDashboard, getDashboardForPermissions, addWidget }
