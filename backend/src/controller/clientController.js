import Case from "../model/case.js";
import Appointment from "../model/appointment.js";
import Payment from "../model/payment.js";

/**
 * Client controller
 *
 * Aggregates client-specific data including:
 * - Cases associated with the client
 * - Scheduled appointments
 * - Payment history
 */
export const getClientDashboard = async (req, res, next) => {
    try {
        // Extract authenticated client ID
        const clientId = req.user._id;

        /**
         * Fetch cases belonging to the client
         * Includes advocate details for context
         */
        const cases = await Case.find({ client: clientId })
            .populate("advocate", "name email")
            .sort({ createdAt: -1 });

        /**
         * Fetch appointments scheduled for the client
         * Sorted by upcoming date
         */
        const appointments = await Appointment.find({ client: clientId })
            .populate("advocate", "name email")
            .sort({ date: 1 });

        /**
         * Fetch payment history for the client
         * Sorted by most recent payments first
         */
        const payments = await Payment.find({ client: clientId })
            .sort({ paidAt: -1 });

        // Send consolidated dashboard response
        res.status(200).json({
            success: true,
            data: {
                cases,
                appointments,
                payments
            }
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
