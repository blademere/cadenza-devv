const express = require("express")
const authRouter = require("../features/auth/auth.routes")
const userRouter = require("../features/users/user.routes")
const appointmentRouter = require("../features/appointments/appointment.routes")
const authorizationAdminRouter = require("../features/authorization-admin/authorization-admin.routes")
const oboRouter = require("../modules/obo")

const router = express.Router()
router.use("/auth", authRouter)
router.use("/users", userRouter)
router.use("/appointments", appointmentRouter)
router.use("/authorization", authorizationAdminRouter)
router.use("/obo", oboRouter)

module.exports = router
