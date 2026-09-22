const JOB_QUEUES = Object.freeze({
  NOTIFICATIONS: "notifications",
  PLATFORM: "platform",
  CLEANUP: "cleanup",
  CADENZA: "cadenza",
})

const JOB_NAMES = Object.freeze({
  NOTIFICATION_DELIVERY: "notification.delivery",
  CADENZA_LIFECYCLE_MAINTENANCE: "cadenza.lifecycle.maintenance",
})

export {
  JOB_QUEUES,
  JOB_NAMES,
}
