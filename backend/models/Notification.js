const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'TASK_ASSIGNED',
          'TASK_STATUS_CHANGED',
          'TASK_UPDATED',
          'COMMENT_ADDED',
          'TASK_DUE_SOON',
          'TASK_OVERDUE',
          'TASK_MENTION',
          'ATTACHMENT_ADDED',
          'TASK_ARCHIVED',
          'TASK_RESTORED',
          'RECURRING_TASK_GENERATED',
          'TEAM_ASSIGNED',
          'TEAM_MEMBER_ADDED',
          'TEAM_MEMBER_REMOVED',
          'SESSION_REVOKED',
          'SYSTEM',
        ],
        message: '{VALUE} is not a valid notification type',
      },
      default: 'SYSTEM',
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
