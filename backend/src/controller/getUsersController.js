import User from "../model/user.js";

/**
 * Get All Advocates Controller
 *
 * Retrieves all approved advocates.
 * Intended for populating selection lists such as
 * case assignment, appointment booking, or junior allocation.
 *
 * Access is restricted to clients and administrators.
 * Only non-sensitive user fields are returned.
 */
export const getAllAdvocates = async (req, res, next) => {
  try {

    // Define roles permitted to access advocate listings
    const allowedRoles = ["client", "admin"];

    // Enforce role-based access control
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Fetch approved advocates with limited fields
    const advocates = await User.find({
      role: "advocate",
      verificationStatus: "approved",
    })
      .select("_id name email role verificationStatus lastLoginAt createdAt")
      .sort({ createdAt: -1 });

    // Respond with advocate list
    res.status(200).json({
      success: true,
      count: advocates.length,
      data: advocates,
    });
  } catch (error) {
    // Forward errors to the global error handler
    next(error);
  }
};

/**
 * Get All Clients Controller
 *
 * Retrieves all users with the client role.
 * Intended for internal selection lists such as
 * appointment scheduling or case creation.
 *
 * Access is restricted to advocates and administrators.
 * Only non-sensitive user fields are returned.
 */
export const getAllClients = async (req, res, next) => {
  try {
    // Ensure request is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Define roles permitted to access client listings
    const allowedRoles = ["advocate", "admin"];

    // Enforce role-based access control
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Fetch clients with limited fields
    const clients = await User.find({ role: "client" })
      .select(
        "_id name email role verificationStatus lastLoginAt createdAt"
      )
      .sort({ createdAt: -1 });

    // Respond with client list
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    // Forward errors to the global error handler
    next(error);
  }
};

/**
 * Get All Junior Advocates Controller
 *
 * Retrieves all approved junior advocates.
 * Intended for assigning juniors to cases or advocates.
 *
 * Access is restricted to advocates and administrators.
 * Only non-sensitive user fields are returned.
 */
export const getAllJuniors = async (req, res, next) => {
  try {
    // Ensure request is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Define roles permitted to access junior advocate listings
    const allowedRoles = ["advocate", "admin"];

    // Enforce role-based access control
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Fetch approved junior advocates with limited fields
    const juniors = await User.find({
      role: "junior_advocate",
      verificationStatus: "approved",
    })
      .select(
        "_id name email role verificationStatus lastLoginAt createdAt"
      )
      .sort({ createdAt: -1 });

    // Respond with junior advocate list
    res.status(200).json({
      success: true,
      count: juniors.length,
      data: juniors,
    });
  } catch (error) {
    // Forward errors to the global error handler
    next(error);
  }
};
