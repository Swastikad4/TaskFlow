const Task = require('../models/Task');
const User = require('../models/User');
const { createNotification } = require('./notificationService');
const { logActivity } = require('./activityService');
const {
  emitTaskCreated,
  emitRecurringTaskGenerated,
} = require('../sockets/socketHandler');

/**
 * Calculate the next execution date based on frequency and interval
 * @param {string} frequency - 'Daily' | 'Weekly' | 'Monthly'
 * @param {number} interval - step interval (default: 1)
 * @param {Date} fromDate - base date to step forward from
 * @returns {Date} Next run date
 */
const calculateNextRun = (frequency, interval = 1, fromDate = new Date()) => {
  const next = new Date(fromDate);
  const step = Math.max(1, parseInt(interval, 10) || 1);

  switch (frequency) {
    case 'Daily':
      next.setDate(next.getDate() + step);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + step * 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + step);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
};

/**
 * Process all eligible recurring tasks and generate new task instances
 * with duplicate prevention and timeline activity logging.
 */
const processRecurringTasks = async () => {
  try {
    const now = new Date();

    // Query recurring templates ready to run
    const recurringTasks = await Task.find({
      isRecurring: true,
      isArchived: { $ne: true },
      'recurrence.frequency': { $in: ['Daily', 'Weekly', 'Monthly'] },
      $or: [
        { 'recurrence.nextRun': { $lte: now } },
        { 'recurrence.nextRun': null },
      ],
    }).populate('createdBy', 'name email role').populate('assignedTo', 'name email role');

    let generatedCount = 0;

    for (const parentTask of recurringTasks) {
      const rec = parentTask.recurrence || {};

      // Check if past end date
      if (rec.endDate && new Date(rec.endDate) < now) {
        parentTask.isRecurring = false;
        await parentTask.save();
        continue;
      }

      // Check if start date is in the future
      if (rec.startDate && new Date(rec.startDate) > now) {
        if (!rec.nextRun) {
          parentTask.recurrence.nextRun = new Date(rec.startDate);
          await parentTask.save();
        }
        continue;
      }

      // Duplicate prevention: if already generated in the last 2 minutes, advance nextRun
      if (
        rec.lastGeneratedAt &&
        now.getTime() - new Date(rec.lastGeneratedAt).getTime() < 60 * 1000
      ) {
        parentTask.recurrence.nextRun = calculateNextRun(
          rec.frequency,
          rec.interval || 1,
          rec.nextRun || now
        );
        await parentTask.save();
        continue;
      }

      // Compute standard due date for generated task
      let newDueDate = null;
      if (parentTask.dueDate) {
        const offset = new Date(parentTask.dueDate).getTime() - new Date(parentTask.createdAt).getTime();
        newDueDate = new Date(now.getTime() + Math.max(offset, 24 * 60 * 60 * 1000));
      } else {
        newDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // Create new task instance
      const newTask = await Task.create({
        title: parentTask.title,
        description: parentTask.description,
        createdBy: parentTask.createdBy?._id || parentTask.createdBy,
        assignedTo: parentTask.assignedTo?._id || parentTask.assignedTo || null,
        priority: parentTask.priority || 'Medium',
        status: 'To Do',
        tags: parentTask.tags || [],
        team: parentTask.team || null,
        dueDate: newDueDate,
        isRecurring: false,
        recurrence: {
          frequency: 'None',
          parentTaskId: parentTask._id,
        },
      });

      const populatedNewTask = await Task.findById(newTask._id)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role');

      // Update parent task recurrence stats
      parentTask.recurrence.lastGeneratedAt = now;
      parentTask.recurrence.nextRun = calculateNextRun(
        rec.frequency,
        rec.interval || 1,
        now
      );
      await parentTask.save();

      // Dispatch Socket.IO events
      emitTaskCreated(populatedNewTask);
      emitRecurringTaskGenerated({
        parentTaskId: parentTask._id,
        generatedTaskId: populatedNewTask._id,
        task: populatedNewTask,
      });

      // Log activity
      await logActivity({
        taskId: newTask._id,
        userId: parentTask.createdBy?._id || parentTask.createdBy,
        action: 'RECURRING_TASK_GENERATED',
        description: `Automated ${rec.frequency} recurring task created: "${populatedNewTask.title}"`,
        metadata: {
          parentTaskId: parentTask._id,
          frequency: rec.frequency,
        },
      });

      // Send notification
      const recipientId = parentTask.assignedTo?._id || parentTask.createdBy?._id;
      if (recipientId) {
        await createNotification({
          userId: recipientId.toString(),
          message: `🔄 Recurring task generated: "${populatedNewTask.title}" (${rec.frequency})`,
          type: 'RECURRING_TASK_GENERATED',
          taskId: populatedNewTask._id,
        });
      }

      generatedCount++;
    }

    return { success: true, count: generatedCount };
  } catch (error) {
    console.error(`[RecurringService] Error executing recurring task runner: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Start recurring task background scheduler
 * @param {number} intervalMs - Interval between execution checks (default 2 mins)
 */
const startRecurringScheduler = (intervalMs = 2 * 60 * 1000) => {
  // Initial check
  processRecurringTasks();

  const timer = setInterval(() => {
    processRecurringTasks();
  }, intervalMs);

  return timer;
};

module.exports = {
  calculateNextRun,
  processRecurringTasks,
  startRecurringScheduler,
};
