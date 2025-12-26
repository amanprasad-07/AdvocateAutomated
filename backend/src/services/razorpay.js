import dotenv from "dotenv";
dotenv.config();

import Razorpay from "razorpay";

/**
 * Razorpay service configuration
 *
 * Initializes and exports a Razorpay instance
 * using credentials loaded from environment variables.
 */

// Ensure required Razorpay credentials are present
// Prevents application startup with incomplete payment configuration
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are missing in environment variables");
}

// Create Razorpay client instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Export configured Razorpay instance for reuse across controllers
export default razorpay;
