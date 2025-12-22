import express from 'express'
import dotenv from 'dotenv'

import { connectDb } from './config/db.js';

// Load environment variables before everything
dotenv.config();

const app = express();
app.use(express.json());

//Database connection and server startup
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await connectDb();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        })
    } catch (error) {
        console.error("Failed to start server", error.message);
    }
};

startServer();