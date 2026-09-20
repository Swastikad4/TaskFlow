const Comment = require('../models/Comment');
const Task = require('../models/Task');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { emitCommentAdded, emitNotificationCreated } = require('../sockets/socketHandler');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');

/**
 * Helper to detect @user mentions in comment text
 */
const detectMentions = async (text, currentUserId) => {
  if (!text || !text.includes('@')) return [];

  // Match words starting with @ (e.g., @Alex, @Rahul, @alex.morgan)
  const mentionMatches = text.match(/@([a-zA-Z0-9_\.\-]+)/g);
  if (!mentionMatches || mentionMatches.length === 0) return [];

  const rawNames = mentionMatches.map((m) => m.substring(1).toLowerCase());

  // Search users matching name or email
  const users = await User.find({
    $or: [
      { name: { $in: rawNames.map((n) => new RegExp(`^${n}`, 'i')) } },
      { email: { $in: rawNames.map((n) => new RegExp(`^${n}`, 'i')) } },
    ],
  }).select('_id name email');

  // Filter out duplicates and self-mentions
  const matchedIds = [];
  const mentionedUsers = [];

  for (const u of users) {
    const uIdStr = u._id.toString();
    if (!matchedIds.includes(uIdStr)) {
      matchedIds.push(uIdStr);
      mentionedUsers.push(u);
    }
  }

  return mentionedUsers;
};

/**
 * @desc    Get comments for a specific task
 * @route   GET /api/tasks/:id/comments
 * @access  Private
 */
const getCommentsByTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    if (
      req.user.role === 'Team Member' &&
      task.assignedTo?.toString() !== req.user._id.toString() &&
      task.createdBy?.toString() !== req.user._id.toString()
    ) {
      return errorResponse(
        res,
        403,
        'Forbidden: You do not have permission to view comments for this task'
      );
    }

    const comments = await Comment.find({ task: taskId })
      .populate('user', 'name email role')
      .populate('mentions', 'name email role')
      .sort({ createdAt: 1 });

    return successResponse(res, 200, 'Comments retrieved successfully', {
      count: comments.length,
      comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new comment on a task with @mention detection
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
const createComment = async (req, res, next) => {
  try {
    const { text, mentions: explicitMentions } = req.body;

    if (!text || !text.trim()) {
      return errorResponse(res, 400, 'Comment text cannot be empty');
    }

    const taskId = req.params.taskId || req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    if (
      req.user.role === 'Team Member' &&
      task.assignedTo?.toString() !== req.user._id.toString() &&
      task.createdBy?.toString() !== req.user._id.toString()
    ) {
      return errorResponse(
        res,
        403,
        'Forbidden: You do not have permission to comment on this task'
      );
    }

    // Auto-detect mentions in text or use explicit mentions
    const detectedUsers = await detectMentions(text.trim(), req.user._id);
    const mentionIds = detectedUsers.map((u) => u._id);

    if (Array.isArray(explicitMentions)) {
      for (const mId of explicitMentions) {
        if (!mentionIds.some((id) => id.toString() === mId.toString())) {
          mentionIds.push(mId);
        }
      }
    }

    const comment = await Comment.create({
      task: taskId,
      user: req.user._id,
      text: text.trim(),
      mentions: mentionIds,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name email role')
      .populate('mentions', 'name email role');

    // 1. Emit Socket Event
    emitCommentAdded(taskId, populatedComment);

    const authorName = req.user.name || 'User';

    // 2. Log Activity
    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'COMMENT_ADDED',
      description: `${authorName} commented: "${comment.text.length > 60 ? comment.text.substring(0, 60) + '...' : comment.text}"`,
      metadata: { commentId: comment._id, mentions: mentionIds },
    });

    // 3. Mention Notifications (Skip self-mentions!)
    const notifiedUserIds = new Set();

    for (const mentionedUser of populatedComment.mentions) {
      const targetUserId = mentionedUser._id.toString();
      if (targetUserId !== req.user._id.toString() && !notifiedUserIds.has(targetUserId)) {
        notifiedUserIds.add(targetUserId);
        const mentionNotif = await createNotification({
          userId: targetUserId,
          message: `${authorName} mentioned you in Task: "${task.title}"`,
          type: 'TASK_MENTION',
          taskId: task._id,
        });
        emitNotificationCreated(targetUserId, mentionNotif);
      }
    }

    // 4. Standard task creator/assignee notifications (if not already notified via mention)
    if (
      task.createdBy &&
      task.createdBy.toString() !== req.user._id.toString() &&
      !notifiedUserIds.has(task.createdBy.toString())
    ) {
      await createNotification({
        userId: task.createdBy.toString(),
        message: `${authorName} commented on task: "${task.title}"`,
        type: 'COMMENT_ADDED',
        taskId: task._id,
      });
      notifiedUserIds.add(task.createdBy.toString());
    }

    if (
      task.assignedTo &&
      task.assignedTo.toString() !== req.user._id.toString() &&
      !notifiedUserIds.has(task.assignedTo.toString())
    ) {
      await createNotification({
        userId: task.assignedTo.toString(),
        message: `${authorName} commented on your assigned task: "${task.title}"`,
        type: 'COMMENT_ADDED',
        taskId: task._id,
      });
      notifiedUserIds.add(task.assignedTo.toString());
    }

    return successResponse(res, 201, 'Comment added successfully', {
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCommentsByTask,
  createComment,
};
