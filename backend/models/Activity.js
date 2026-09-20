const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    action: {
      type: String,
      required: [true, 'Activity action is required'],
      enum: [
        'TASK_CREATED',
        'STATUS_CHANGED',
        'ASSIGNED',
        'REASSIGNED',
        'PRIORITY_CHANGED',
        'DUE_DATE_CHANGED',
        'TASK_EDITED',
        'COMMENT_ADDED',
        'ATTACHMENT_ADDED',
        'ATTACHMENT_DELETED',
        'CHECKLIST_UPDATED',
        'TASK_ARCHIVED',
        'TASK_RESTORED',
        'TASK_DELETED',
        'RECURRING_TASK_GENERATED',
        'TEAM_ASSIGNED',
        'TEAM_MEMBER_ADDED',
        'TEAM_MEMBER_REMOVED',
      ],
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for chronological timeline queries
activitySchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
