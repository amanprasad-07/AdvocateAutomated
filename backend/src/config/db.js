import mongoose from 'mongoose'

export const connectDb = async () => {
    try {
        // Validate presence of MongoDB connection string
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        // Attempt database connection
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected successfully");

    } catch (error) {
        console.error("Database connection failed", error.message);
        
        // Exit process with failure code to avoid running without DB
        process.exit(1);
    }
}