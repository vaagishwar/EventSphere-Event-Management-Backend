const express = require("express")
const authRouter = express.Router()
const controller = require("../controllers/auth.controller.js")





authRouter.post("/register",controller.register)
authRouter.post("/login",controller.login)
authRouter.post("/send-verify-otp",controller.sendVerifyOtp)
authRouter.post("/verify-otp",controller.verifyOtp)







module.exports = authRouter
