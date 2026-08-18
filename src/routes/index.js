const express = require("express")

const authRouter = require("../features/auth/auth.routes")
const userRouter = require("../features/users/user.routes")
const appointmentRouter = require("../features/appointments/appointment.routes")
const documentRouter = require("../features/documents/document.routes")
const notificationRouter = require("../features/notifications/notification.routes")
const auditRouter = require("../features/audit/audit.routes")

const router = express.Router()

router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/appointments", appointmentRouter)
router.use("/documents", documentRouter)
router.use("/notifications", notificationRouter)
router.use("/audit-logs", auditRouter)

module.exports = router
