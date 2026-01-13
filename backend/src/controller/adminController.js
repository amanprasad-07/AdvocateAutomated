import User from "../model/user.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import AuditLog from "../model/auditLog.js";

/**
 * Get Admin Dashboard Statistics
 *
 * Provides a high-level, read-only overview of the system.
 * Intended for administrative dashboards.
 */
export const getAdminDashboardStats = async (req, res, next) => {
  try {
    // Execute all count queries in parallel for efficiency
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

    // Return aggregated statistics
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
    // Forward unexpected errors to centralized error handler
    next(error);
  }
};

/**
 * Get Pending Advocates Controller
 *
 * Retrieves all advocates and junior advocates
 * whose verification is pending and has been submitted.
 * Intended for admin review workflows.
 */
export const getPendingAdvocates = async (req, res, next) => {
  try {
    // Query users awaiting verification review
    const pendingAdvocates = await User.find({
      role: { $in: ["advocate", "junior_advocate"] },
      verificationStatus: "pending",
      "advocateProfile.submittedAt": { $exists: true }
    })
      // Restrict fields to essential review information
      .select("name email role createdAt advocateProfile");

    // Respond with pending advocate list
    res.status(200).json({
      success: true,
      count: pendingAdvocates.length,
      data: pendingAdvocates
    });
  } catch (error) {
    // Forward errors to centralized error-handling middleware
    next(error);
  }
};

/**
 * Approve Advocate Controller
 *
 * Marks an advocate or junior advocate as approved
 * after successful administrative review.
 */
export const approveAdvocate = async (req, res, next) => {
  try {
    // Extract target user ID from request parameters
    const { userId } = req.params;

    // Fetch user record
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    // Ensure user has an advocate-related role
    if (!["advocate", "junior_advocate"].includes(user.role)) {
      const error = new Error("User is not an advocate");
      error.statusCode = 400;
      return next(error);
    }

    // Ensure verification data has been submitted
    if (!user.advocateProfile?.submittedAt) {
      const error = new Error(
        "Cannot approve advocate without submitted verification details"
      );
      error.statusCode = 400;
      return next(error);
    }

    // Prevent duplicate verification actions
    if (user.verificationStatus !== "pending") {
      const error = new Error("Verification already processed");
      error.statusCode = 400;
      return next(error);
    }

    if (user.verificationStatus === "rejected") {
      const err = new Error("Rejected advocates must resubmit verification");
      err.statusCode = 400;
      return next(err);
    }

    // Update verification state and review metadata
    user.verificationStatus = "approved";
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;

    // Persist changes without full validation
    await user.save({ validateBeforeSave: false });

    // Record approval in audit logs
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

    // Respond with approval confirmation
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
 * Reject Advocate Controller
 *
 * Marks an advocate or junior advocate as rejected
 * after administrative review, with a mandatory reason.
 */
export const rejectAdvocate = async (req, res, next) => {
  try {
    // Extract target user ID from request parameters
    const { userId } = req.params;

    // Fetch user record
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    // Ensure user has an advocate-related role
    if (!["advocate", "junior_advocate"].includes(user.role)) {
      const error = new Error("User is not an advocate");
      error.statusCode = 400;
      return next(error);
    }

    // Prevent duplicate verification actions
    if (user.verificationStatus !== "pending") {
      const error = new Error("Verification already processed");
      error.statusCode = 400;
      return next(error);
    }

    // Validate rejection reason
    const { reason } = req.body;
    if (!reason) {
      const err = new Error("Rejection reason is required");
      err.statusCode = 400;
      return next(err);
    }

    // Update verification state and review metadata
    user.verificationStatus = "rejected";
    user.verificationRejectionReason = reason;
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.user._id;

    // Persist changes without full validation
    await user.save({ validateBeforeSave: false });

    // Record rejection in audit logs
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

    // Respond with rejection confirmation
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
 * Get Verified Advocates Controller
 *
 * Returns all advocates and junior advocates
 * whose verification status is approved.
 */
export const getVerifiedAdvocates = async (req, res, next) => {
  try {
    // Fetch approved advocates for administrative oversight
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
    // Forward unexpected errors
    next(error);
  }
};

/**
 * Get All Users Controller
 *
 * Provides a complete, read-only list of users
 * for administrative oversight.
 */
export const getAllUsers = async (req, res, next) => {
  try {
    // Fetch all users with non-sensitive fields
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
    // Forward unexpected errors
    next(error);
  }
};

/**
 * Toggle User Active Status Controller
 *
 * Soft activates or deactivates a user account.
 * Intended for administrative moderation.
 */
export const toggleUserActiveStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Fetch target user
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    // Prevent administrators from disabling their own account
    if (user._id.toString() === req.user._id.toString()) {
      const err = new Error("You cannot deactivate your own account");
      err.statusCode = 400;
      return next(err);
    }

    // Toggle active state
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    // Respond with updated user state
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
    // Forward unexpected errors
    next(error);
  }
};

/**
 * Get All Cases for Admin Controller
 *
 * Returns all cases in a read-only mode.
 * Supports optional filtering by advocate or status.
 */
export const getAllCasesForAdmin = async (req, res, next) => {
  try {
    const { advocate, status } = req.query;

    let filter = {};

    // Apply optional advocate filter
    if (advocate) {
      filter.advocate = advocate;
    }

    // Apply optional status filter
    if (status) {
      filter.status = status;
    }

    // Fetch cases with related user details
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
    // Forward unexpected errors
    next(error);
  }
};

/**
 * Get Audit Logs Controller
 *
 * Provides recent audit trail entries
 * for administrative monitoring and review.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    // Fetch recent audit logs with safety limit
    const logs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    // Forward unexpected errors
    next(error);
  }
};
