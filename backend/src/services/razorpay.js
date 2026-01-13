import dotenv from "dotenv";
dotenv.config();

import Razorpay from "razorpay";

/**
 * Razorpay Service Configuration
 *
 * Initializes and exports a configured Razorpay client
 * using credentials loaded from environment variables.
 */

// Validate presence of required Razorpay credentials
// Prevents application startup with incomplete payment configuration
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are missing in environment variables");
}

// Create and configure Razorpay client instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Export the Razorpay instance for reuse across controllers and services
export default razorpay;
