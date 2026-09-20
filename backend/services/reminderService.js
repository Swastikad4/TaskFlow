const Task = require('../models/Task');
const { createNotification } = require('./notificationService');

/**
 * Scan tasks and issue due-date reminders with strict duplicate prevention
 */
const checkAndSendDueReminders = async () => {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find all uncompleted tasks with a due date
    const tasks = await Task.find({
      dueDate: { $ne: null },
      status: { $ne: 'Completed' },
    });

    let sentCount = 0;

    for (const task of tasks) {
      const recipientId = task.assignedTo || task.createdBy;
      if (!recipientId) continue;

      const due = new Date(task.dueDate);
      const isOverdue = due < now;
      const isDueSoon = due >= now && due <= twentyFourHoursFromNow;

      // Check if task is overdue
      if (isOverdue) {
        // Check if an OVERDUE reminder was already sent in the last 24 hours
        const alreadySentOverdue = task.reminderLogs?.some(
          (log) =>
            log.type === 'OVERDUE' &&
            now.getTime() - new Date(log.sentAt).getTime() < 24 * 60 * 60 * 1000
        );

        if (!alreadySentOverdue) {
          await createNotification({
            userId: recipientId.toString(),
            message: `⚠️ Task Overdue: "${task.title}" was due on ${due.toLocaleDateString()}`,
            type: 'TASK_OVERDUE',
            taskId: task._id,
          });

          task.reminderLogs.push({ type: 'OVERDUE', sentAt: new Date() });
          await task.save();
          sentCount++;
        }
      } else if (isDueSoon) {
        // Check if DUE_SOON reminder was already sent
        const alreadySentDueSoon = task.reminderLogs?.some(
          (log) =>
            log.type === 'DUE_SOON' &&
            now.getTime() - new Date(log.sentAt).getTime() < 24 * 60 * 60 * 1000
        );

        if (!alreadySentDueSoon) {
          await createNotification({
            userId: recipientId.toString(),
            message: `⏰ Task Due Soon: "${task.title}" is due on ${due.toLocaleDateString()}`,
            type: 'TASK_DUE_SOON',
            taskId: task._id,
          });

          task.reminderLogs.push({ type: 'DUE_SOON', sentAt: new Date() });
          await task.save();
          sentCount++;
        }
      }
    }

    return { success: true, remindersSent: sentCount };
  } catch (error) {
    console.error(`[ReminderService] Error during reminder scan: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Start periodic reminder cron interval (checks every 10 minutes)
 */
const startReminderScheduler = (intervalMs = 10 * 60 * 1000) => {
  // Initial scan on startup
  checkAndSendDueReminders();

  // Periodic interval
  const timer = setInterval(() => {
    checkAndSendDueReminders();
  }, intervalMs);

  return timer;
};

module.exports = {
  checkAndSendDueReminders,
  startReminderScheduler,
};
