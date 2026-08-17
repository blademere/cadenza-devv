const express = require("express")

const authRouter = require("../features/auth/auth.routes")
const userRouter = require("../features/users/user.routes")

const router = express.Router()

router.use("/auth", authRouter)
router.use("/users", userRouter)

module.exports = router
