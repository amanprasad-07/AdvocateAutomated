/**
 * Fetch advocate dashboard data.
 *
 * Returns authenticated advocate’s profile information
 * along with placeholder statistics for future expansion.
 */
export const getAdvocateDashboard = async (req, res, next) => {
    try {
        // Authenticated user injected by authentication middleware
        const user = req.user;

        // Send dashboard response
        res.status(200).json({
            success: true,
            data: {
                // Core user identity fields
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,

                // Verification and access status
                verificationStatus: user.verificationStatus,
                isVerified: user.verificationStatus === "approved",

                // Audit information
                lastLoginAt: user.lastLoginAt,

                /**
                 * Dashboard statistics
                 * Currently placeholders and intended
                 * to be populated with real aggregates later
                 */
                stats: {
                    casesAssigned: 0,
                    casesClosed: 0,
                    pendingTasks: 0
                }
            }
        });

    } catch (error) {
        // Forward any unexpected errors to centralized error handler
        next(error);
    }
};
