const Activity = require('../models/Activity');
const { emitActivityCreated } = require('../sockets/socketHandler');

/**
 * Log a structured activity entry for a task and broadcast via WebSockets
 */
const logActivity = async ({ taskId, userId, action, description, metadata = {} }) => {
  try {
    const activity = await Activity.create({
      task: taskId,
      user: userId,
      action,
      description,
      metadata,
    });

    const populatedActivity = await Activity.findById(activity._id).populate(
      'user',
      'name email role'
    );

    // Emit real-time activityCreated event
    emitActivityCreated(taskId.toString(), populatedActivity);

    return populatedActivity;
  } catch (error) {
    console.error(`[ActivityService] Error recording activity: ${error.message}`);
    return null;
  }
};

module.exports = {
  logActivity,
};
