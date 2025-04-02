import express from 'express'
import Auth from '../Middleware/Auth.js'
import { getUser } from '../Controllers/userController.js'

const userRouter = express.Router()
userRouter.get('/getUser', Auth, getUser)

export default userRouter