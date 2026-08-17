const prisma = require("../infrastructure/database/prisma")
const { markDueSlas, markEscalations } = require("./sla/sla.service")
const { queueNotifications } = require("./notifications/notification.service")
const { queueEvent } = require("./integrations/webhook.service")

const runPlatformMaintenance = async ({ now = new Date(), batchSize = 100 } = {}) => {
  const [due, escalated] = await Promise.all([
    markDueSlas({ now }),
    markEscalations({ now }),
  ])

  const events = []
  for (const id of due?.ids || []) events.push({ event: "sla.breached", id })
  for (const id of escalated?.ids || []) events.push({ event: "sla.escalated", id })

  for (const item of events.slice(0, batchSize)) {
    const instance = await prisma.slaInstance.findUnique({ where: { id: item.id } })
    if (!instance) continue
    const context = { slaInstanceId: instance.id, subjectType: instance.subjectType, subjectId: instance.subjectId, event: item.event }
    await queueNotifications({ event: item.event, entityType: instance.subjectType, context })
    await queueEvent({ event: item.event, entityType: instance.subjectType, entityId: instance.subjectId, payload: context })
  }

  return { due: due?.count || 0, escalated: escalated?.count || 0 }
}

module.exports = { runPlatformMaintenance }
