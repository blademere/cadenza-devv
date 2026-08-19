const express = require("express")
const authRouter = require("../features/auth/auth.routes")
const userRouter = require("../features/users/user.routes")
const appointmentRouter = require("../features/appointments/appointment.routes")
const oboRouter = require("../modules/obo")
const authorizationAdminRouter = require("../platform/authorization/authorization-admin.routes")

const router = express.Router()
router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/appointments", appointmentRouter)
router.use("/authorization", authorizationAdminRouter)
router.use("/obo", oboRouter)

module.exports = router
