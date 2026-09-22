import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createTemplate = (data, db = prisma) => db.notificationTemplate.create({ data })
const findTemplateByKey = (key, db = prisma) => db.notificationTemplate.findUnique({ where: { key } })
const createRule = (data, db = prisma) => db.notificationRule.create({ data })
const findRulesForEvent = ({ event, entityType }, db = prisma) =>
  db.notificationRule.findMany({
    where: {
      event,
      active: true,
      ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}),
    },
    include: { template: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
const findActiveUsersByRole = (roleName, db = prisma) =>
  db.user.findMany({
    where: { isActive: true, role: { name: roleName } },
    select: { email: true },
  })
const findActiveUsersByPermission = ({ action, resource }, db = prisma) =>
  db.user.findMany({
    where: {
      isActive: true,
      role: {
        permissions: {
          some: { permission: { action, module: { key: resource } } },
        },
      },
    },
    select: { email: true },
  })
const findUserNotificationProfile = (id, db = prisma) =>
  db.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true, notificationPreferences: true },
  })
const findDelivery = (id, db = prisma) => db.notificationDelivery.findUnique({ where: { id } })
const claimDelivery = ({ id, status, updatedAt }, data, db = prisma) =>
  db.notificationDelivery.updateMany({ where: { id, status, updatedAt }, data })
const createDelivery = (data, db = prisma) => db.notificationDelivery.create({ data })
const updateDelivery = ({ id, status }, data, db = prisma) =>
  db.notificationDelivery.update({ where: { id, ...(status ? { status } : {}) }, data })
const upsertInAppNotification = (where, create, db = prisma) =>
  db.notification.upsert({ where, create, update: {} })
const upsertDelivery = ({ where, create, update = {} }, db = prisma) =>
  db.notificationDelivery.upsert({ where, create, update })
const transaction = (operation, db = prisma) => (db === prisma ? prisma.$transaction(operation) : operation(db))
const createNotification = (data, db = prisma) => db.notification.create({ data })
const findUserForSend = (id, db = prisma) =>
  db.user.findUnique({ where: { id }, select: { id: true, email: true, isActive: true, notificationPreferences: true } })

export {
  createTemplate,
  findTemplateByKey,
  createRule,
  findRulesForEvent,
  findActiveUsersByRole,
  findActiveUsersByPermission,
  findUserNotificationProfile,
  findDelivery,
  claimDelivery,
  createDelivery,
  updateDelivery,
  upsertInAppNotification,
  upsertDelivery,
  transaction,
  createNotification,
  findUserForSend,
}
