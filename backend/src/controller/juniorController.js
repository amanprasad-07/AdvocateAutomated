import Task from "../model/task.js";
import Case from "../model/case.js";
import Evidence from "../model/evidence.js";

/**
 * Junior Advocate Dashboard Controller
 *
 * Aggregates junior advocate–specific data including:
 * - Tasks assigned to the junior advocate
 * - Cases where the junior advocate is assigned
 * - Evidence uploaded by the junior advocate
 */
export const getJuniorDashboard = async (req, res, next) => {
    try {
        // Extract authenticated junior advocate ID
        const juniorId = req.user._id;

        /**
         * Fetch tasks assigned to the junior advocate
         * Sorted by nearest due date
         */
        const tasks = await Task.find({ assignedTo: juniorId })
            .populate("case", "caseNumber title")
            .sort({ dueDate: 1 });

        /**
         * Fetch cases where the junior advocate is assigned
         * Includes primary advocate details for context
         */
        const cases = await Case.find({ assignedJuniors: juniorId })
            .populate("advocate", "name email");

        /**
         * Fetch evidence uploaded by the junior advocate
         * Includes related case details
         */
        const evidences = await Evidence.find({
            uploadedBy: juniorId
        }).populate("case", "caseNumber title");

        // Send consolidated dashboard response
        res.status(200).json({
            success: true,
            data: {
                tasks,
                cases,
                evidences
            }
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
