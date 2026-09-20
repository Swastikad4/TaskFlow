const Activity = require('../models/Activity');
const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get activity timeline for a task
 * @route   GET /api/tasks/:id/activities
 * @access  Private
 */
const getTaskActivities = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    // Visibility check for Team Members
    if (
      req.user.role === 'Team Member' &&
      task.assignedTo?.toString() !== req.user._id.toString() &&
      task.createdBy?.toString() !== req.user._id.toString()
    ) {
      return errorResponse(
        res,
        403,
        'Forbidden: You do not have permission to view activity for this task'
      );
    }

    const activities = await Activity.find({ task: req.params.id })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Activities retrieved successfully', {
      count: activities.length,
      activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTaskActivities,
};
