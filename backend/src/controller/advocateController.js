export const getAdvocateDashboard = async (req, res, next) => {
    try {
        const user = req.user;

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verificationStatus: user.verificationStatus,
                isVerified: user.verificationStatus === "approved",
                lastLoginAt: user.lastLoginAt,

                // Placeholder stats (future)
                stats: {
                    casesAssigned: 0,
                    casesClosed: 0,
                    pendingTasks: 0
                }
            }
        });

    } catch (error) {
        next(error);
    }
};
