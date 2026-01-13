import User from "../model/user.js";

export const submitAdvocateProfile = async (req, res, next) => {
  try {
    const { enrollmentNumber, barCouncil, experienceYears, documents } = req.body;

    if (!enrollmentNumber || !barCouncil) {
      const err = new Error("Enrollment number and bar council are required");
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    if (user.role === "client") {
      const err = new Error("Invalid role");
      err.statusCode = 403;
      return next(err);
    }

    user.advocateProfile = {
      enrollmentNumber,
      barCouncil,
      experienceYears,
      documents,
      submittedAt: new Date()
    };

    user.verificationRejectionReason = undefined;
    user.verificationStatus = "pending";


    await user.save();

    res.status(200).json({
      success: true,
      message: "Credentials submitted for verification"
    });
  } catch (error) {
    next(error);
  }
};
