const JOB_QUEUES = Object.freeze({
  NOTIFICATIONS: "notifications",
  PLATFORM: "platform",
  CLEANUP: "cleanup",
})

const JOB_NAMES = Object.freeze({
  NOTIFICATION_DELIVERY: "notification.delivery",
})

module.exports = {
  JOB_QUEUES,
  JOB_NAMES,
}
