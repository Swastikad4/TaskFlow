const mongoose = require('mongoose');

const reminderLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DUE_SOON', 'DUE_TODAY', 'OVERDUE'],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const checklistItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Checklist item title is required'],
      trim: true,
      maxlength: [200, 'Checklist item cannot exceed 200 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [120, 'Task title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task creator is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['To Do', 'In Progress', 'Completed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'To Do',
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    favoritedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reminderLogs: {
      type: [reminderLogSchema],
      default: [],
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    recurrence: {
      frequency: {
        type: String,
        enum: ['Daily', 'Weekly', 'Monthly', 'None'],
        default: 'None',
      },
      interval: {
        type: Number,
        default: 1,
        min: 1,
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      nextRun: {
        type: Date,
        default: null,
      },
      lastGeneratedAt: {
        type: Date,
        default: null,
      },
      parentTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ team: 1 });
taskSchema.index({ favoritedBy: 1 });
taskSchema.index({ isArchived: 1, createdAt: -1 });
taskSchema.index({ isRecurring: 1, 'recurrence.nextRun': 1 });

module.exports = mongoose.model('Task', taskSchema);
