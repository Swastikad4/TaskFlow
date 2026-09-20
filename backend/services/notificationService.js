const Notification = require('../models/Notification');
const { emitNotificationCreated } = require('../sockets/socketHandler');

/**
 * Create a persistent notification and trigger real-time socket delivery
 */
const createNotification = async ({ userId, message, type, taskId = null }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      message,
      type,
      task: taskId,
    });

    // Real-time broadcast to connected user room
    emitNotificationCreated(userId.toString(), notification);

    return notification;
  } catch (error) {
    console.error(`[NotificationService] Error creating notification: ${error.message}`);
    return null;
  }
};

module.exports = {
  createNotification,
};
