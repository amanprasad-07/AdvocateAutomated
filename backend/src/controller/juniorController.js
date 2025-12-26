import Task from "../model/task.js";
import Case from "../model/case.js";
import Evidence from "../model/evidence.js";

export const getJuniorDashboard = async (req, res, next) => {
    try {
        const juniorId = req.user._id;

        const tasks = await Task.find({ assignedTo: juniorId })
            .populate("case", "caseNumber title")
            .sort({ dueDate: 1 });

        const cases = await Case.find({ assignedJuniors: juniorId })
            .populate("advocate", "name email");

        const evidences = await Evidence.find({
            uploadedBy: juniorId
        }).populate("case", "caseNumber title");

        res.status(200).json({
            success: true,
            data: {
                tasks,
                cases,
                evidences
            }
        });

    } catch (error) {
        next(error);
    }
};
