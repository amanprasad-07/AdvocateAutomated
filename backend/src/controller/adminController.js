import User from "../model/user.js";

export const getPendingAdvocates = async (req, res, next) => {
    try {
        const pendingAdvocates = await User.find({
            role: { $in: ["advocate", "junior_advocate"] },
            verificationStatus: "pending"
        }).select("name email role createdAt");

        res.status(200).json({
            success: true,
            count: pendingAdvocates.length,
            data: pendingAdvocates
        });
    } catch (error) {
        next(error);
    }
};


/**
 * APPROVE advocate
 */
export const approveAdvocate = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            return next(error);
        }

        if (!["advocate", "junior_advocate"].includes(user.role)) {
            const error = new Error("User is not an advocate");
            error.statusCode = 400;
            return next(error);
        }

        user.verificationStatus = "approved";
        user.verificationReviewedAt = new Date();
        user.verificationReviewedBy = req.user._id;

        await user.save({ validateBeforeSave: false });

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
        next(error);
    }
};

/**
 * REJECT advocate
 */
export const rejectAdvocate = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            return next(error);
        }

        if (!["advocate", "junior_advocate"].includes(user.role)) {
            const error = new Error("User is not an advocate");
            error.statusCode = 400;
            return next(error);
        }

        user.verificationStatus = "rejected";
        user.verificationReviewedAt = new Date();
        user.verificationReviewedBy = req.user._id;

        await user.save({ validateBeforeSave: false });

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
        next(error);
    }
};