const express = require("express")

const authRouter = require("../features/auth/auth.routes")
const userRouter = require("../features/users/user.routes")
const appointmentRouter = require("../features/appointments/appointment.routes")

const router = express.Router()

// Expose only application-facing feature APIs here.
// Cross-cutting capabilities such as documents, notifications, and audit logs
// are intentionally kept internal until a domain module owns their API contract.
router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/appointments", appointmentRouter)

module.exports = router
