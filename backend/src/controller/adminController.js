import User from "../model/user.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import AuditLog from "../model/auditLog.js";


/**
 * Admin dashboard statistics
 *
 * High-level system overview (read-only)
 */
export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const [
      pendingApprovals,
      verifiedAdvocates,
      totalUsers,
      totalCases,
    ] = await Promise.all([
      User.countDocuments({
        role: { $in: ["advocate", "junior_advocate"] },
        verificationStatus: "pending",
      }),
      User.countDocuments({
        role: { $in: ["advocate", "junior_advocate"] },
        verificationStatus: "approved",
      }),
      User.countDocuments(),
      Case.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        pendingApprovals,
        verifiedAdvocates,
        totalUsers,
        totalCases,
      },
    });
  } catch (error) {
    next(error);
  }
};


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

    await logAuditEvent({
      action: "ADVOCATE_APPROVED",
      entityType: "User",
      entityId: user._id,
      performedBy: req.user._id,
      message: `Advocate ${user.name} approved`,
      metadata: {
        role: user.role,
        email: user.email,
        reviewedAt: new Date(),
      },
    });

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

    await logAuditEvent({
      action: "ADVOCATE_REJECTED",
      entityType: "User",
      entityId: user._id,
      performedBy: req.user._id,
      message: `Advocate ${user.name} rejected`,
      metadata: {
        role: user.role,
        email: user.email,
        reviewedAt: new Date(),
      },
    });

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

/**
 * Fetch all approved advocates and junior advocates
 *
 * Read-only oversight for admin
 */
export const getVerifiedAdvocates = async (req, res, next) => {
  try {
    const verified = await User.find({
      role: { $in: ["advocate", "junior_advocate"] },
      verificationStatus: "approved",
    }).select("name email role verificationReviewedAt");

    res.status(200).json({
      success: true,
      count: verified.length,
      data: verified,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select(
        "name email role verificationStatus isActive lastLoginAt createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active status (soft block / unblock)
 */
export const toggleUserActiveStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    // Prevent admin from disabling themselves
    if (user._id.toString() === req.user._id.toString()) {
      const err = new Error("You cannot deactivate your own account");
      err.statusCode = 400;
      return next(err);
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"}`,
      data: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all cases (admin read-only)
 *
 * Filters:
 * - advocate (optional)
 * - status (optional)
 */
export const getAllCasesForAdmin = async (req, res, next) => {
  try {
    const { advocate, status } = req.query;

    let filter = {};

    if (advocate) {
      filter.advocate = advocate;
    }

    if (status) {
      filter.status = status;
    }

    const cases = await Case.find(filter)
      .populate("client", "name email")
      .populate("advocate", "name email")
      .populate("assignedJuniors", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit logs (admin only)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(200); // safety cap

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};