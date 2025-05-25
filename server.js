import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/Mongo.js';
import authRouter from './Routes/authRoute.js';
import userRouter from './Routes/userRoute.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json())
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser())
connectDB();

// A simple route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
