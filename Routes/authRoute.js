import express from 'express'
import { resetPassword, sentresetOtp, isAuthenticated, register, login, logout, sendVerifyOtp, verifyEmail } from '../Controllers/authController.js'
import Auth from '../Middleware/Auth.js'
const authRouter = express.Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.post('/send-verifyOtp', Auth, sendVerifyOtp)
authRouter.post('/verifyEmail', Auth, verifyEmail)
authRouter.post('/userAuth', Auth, isAuthenticated)
authRouter.post('/resetOtp', Auth, sentresetOtp)
authRouter.post('/reset-pass', Auth, resetPassword)

export default authRouter