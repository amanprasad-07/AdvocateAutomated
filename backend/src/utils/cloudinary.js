import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

/**
 * Cloudinary Configuration
 *
 * Initializes and exports a configured Cloudinary client
 * using credentials provided via environment variables.
 */

// Configure Cloudinary with environment-based credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Export configured Cloudinary instance for reuse across the application
export default cloudinary;
