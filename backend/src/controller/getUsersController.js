import User from "../model/user.js";

/**
 * Fetch users with role = advocate.
 *
 * Intended for populating selection lists
 * (e.g., dropdowns for assigning cases, appointments, juniors).
 * Returns limited, non-sensitive user fields only.
 */
export const getAllAdvocates = async (req, res, next) => {
  try {


    const allowedRoles = ["client", "admin"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const advocates = await User.find({ role: "advocate", verificationStatus: "approved", })
      .select("_id name email role verificationStatus lastLoginAt createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: advocates.length,
      data: advocates,
    });
  } catch (error) {
    next(error);
  }
};



/**
 * Fetch users with role = clients.
 *
 * Intended for populating selection lists
 * (e.g., dropdowns for assigning cases, appointments, juniors).
 * Returns limited, non-sensitive user fields only.
 */
export const getAllClients = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const allowedRoles = ["advocate", "admin"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    const clients = await User.find({ role: "client" })
      .select(
        "_id name email role verificationStatus lastLoginAt createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Fetch users with role = junior_advocate.
 *
 * Intended for populating selection lists
 * (e.g., dropdowns for assigning cases, appointments, juniors).
 * Returns limited, non-sensitive user fields only.
 */
export const getAllJuniors = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const allowedRoles = ["advocate", "admin"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    const juniors = await User.find({ role: "junior_advocate", verificationStatus: "approved", })
      .select(
        "_id name email role verificationStatus lastLoginAt createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: juniors.length,
      data: juniors,
    });
  } catch (error) {
    next(error);
  }
};
