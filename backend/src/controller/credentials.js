import User from "../model/user.js";

/**
 * Submit Advocate Profile Controller
 *
 * Handles submission of advocate credentials for verification.
 * Validates required fields, enforces role restrictions,
 * updates advocate profile details, and resets verification state.
 */
export const submitAdvocateProfile = async (req, res, next) => {
  try {
    // Extract advocate profile details from request body
    const { enrollmentNumber, barCouncil, experienceYears } = req.body;

    // Validate mandatory advocate identification fields
    if (!enrollmentNumber || !barCouncil) {
      const err = new Error("Enrollment number and bar council are required");
      err.statusCode = 400;
      return next(err);
    }

    // Retrieve the authenticated user from the database
    const user = await User.findById(req.user.id);

    // Handle case where user record does not exist
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    // Prevent clients from submitting advocate verification details
    if (user.role === "client") {
      const err = new Error("Invalid role");
      err.statusCode = 403;
      return next(err);
    }

    // Populate advocate profile details for verification
    user.advocateProfile = {
      enrollmentNumber,
      barCouncil,
      experienceYears,
      submittedAt: new Date()
    };

    // Reset verification state to allow re-evaluation
    user.verificationRejectionReason = undefined;
    user.verificationStatus = "pending";

    // Persist updated user record
    await user.save();

    // Respond with success confirmation
    res.status(200).json({
      success: true,
      message: "Credentials submitted for verification"
    });
  } catch (error) {
    // Forward unexpected errors to the global error handler
    next(error);
  }
};
