import User from "../model/user.js";

/**
 * Fetch all advocates and junior advocates
 * whose verification status is currently pending.
 *
 * Intended for admin review dashboards.
 */
export const getPendingAdvocates = async (req, res, next) => {
    try {
        // Query users with advocate roles awaiting verification
        const pendingAdvocates = await User.find({
            role: { $in: ["advocate", "junior_advocate"] },
            verificationStatus: "pending"
        })
        // Limit returned fields to essential review information
        .select("name email role createdAt");

        // Send successful response with count and data
        res.status(200).json({
            success: true,
            count: pendingAdvocates.length,
            data: pendingAdvocates
        });
    } catch (error) {
        // Forward error to centralized error-handling middleware
        next(error);
    }
};

/**
 * APPROVE advocate
 *
 * Marks an advocate or junior advocate as approved
 * after admin review.
 */
export const approveAdvocate = async (req, res, next) => {
    try {
        // Extract user ID from request parameters
        const { userId } = req.params;

        // Fetch user by ID
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            return next(error);
        }

        // Ensure the user is eligible for advocate approval
        if (!["advocate", "junior_advocate"].includes(user.role)) {
            const error = new Error("User is not an advocate");
            error.statusCode = 400;
            return next(error);
        }

        // Update verification status and audit metadata
        user.verificationStatus = "approved";
        user.verificationReviewedAt = new Date();
        user.verificationReviewedBy = req.user._id;

        // Save changes without triggering full validation
        await user.save({ validateBeforeSave: false });

        // Send confirmation response
        res.status(200).json({
            success: true,
            message: "Advocate approved",
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                verificationStatus: user.verificationStatus
            }
        });

    } catch (error) {
        // Forward unexpected errors to error handler
        next(error);
    }
};

/**
 * REJECT advocate
 *
 * Marks an advocate or junior advocate as rejected
 * after admin review.
 */
export const rejectAdvocate = async (req, res, next) => {
    try {
        // Extract user ID from request parameters
        const { userId } = req.params;

        // Fetch user by ID
        const user = await User.findById(userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            return next(error);
        }

        // Ensure the user is eligible for advocate rejection
        if (!["advocate", "junior_advocate"].includes(user.role)) {
            const error = new Error("User is not an advocate");
            error.statusCode = 400;
            return next(error);
        }

        // Update verification status and audit metadata
        user.verificationStatus = "rejected";
        user.verificationReviewedAt = new Date();
        user.verificationReviewedBy = req.user._id;

        // Save changes without triggering full validation
        await user.save({ validateBeforeSave: false });

        // Send confirmation response
        res.status(200).json({
            success: true,
            message: "Advocate rejected",
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                verificationStatus: user.verificationStatus
            }
        });

    } catch (error) {
        // Forward unexpected errors to error handler
        next(error);
    }
};
