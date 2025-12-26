
import Case from "../model/case.js";
import Appointment from "../model/appointment.js";
import Payment from "../model/payment.js";

export const getClientDashboard = async (req, res, next) => {
    try {
        const clientId = req.user._id;

        const cases = await Case.find({ client: clientId })
            .populate("advocate", "name email")
            .sort({ createdAt: -1 });

        const appointments = await Appointment.find({ client: clientId })
            .populate("advocate", "name email")
            .sort({ date: 1 });

        const payments = await Payment.find({ client: clientId })
            .sort({ paidAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                cases,
                appointments,
                payments
            }
        });

    } catch (error) {
        next(error);
    }
};
