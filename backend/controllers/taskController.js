const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskAssigned,
  emitTaskStatusChanged,
  emitTaskMoved,
  emitTaskDeleted,
  emitTaskArchived,
  emitTaskRestored,
  emitChecklistUpdated,
} = require('../sockets/socketHandler');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');
const { calculateNextRun } = require('../services/recurringService');

/**
 * Helper to transform task object and attach user-specific isFavorite flag
 */
const formatTaskForUser = (taskDoc, userId) => {
  if (!taskDoc) return null;
  const taskObj = taskDoc.toObject ? taskDoc.toObject({ virtuals: true }) : { ...taskDoc };
  const favoritedBy = taskObj.favoritedBy || [];
  taskObj.isFavorite = favoritedBy.some(
    (id) => (id._id || id).toString() === userId.toString()
  );
  return taskObj;
};

/**
 * @desc    Get all tasks with advanced multi-filtering, tags, search, date presets, team scoping, favorites, and pagination
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      createdBy,
      tags,
      team,
      isRecurring,
      isFavorite,
      isArchived,
      search,
      dateRange,
      startDate,
      endDate,
      sortBy = 'newest',
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    // Archiving filter: By default exclude archived tasks unless explicitly requested
    if (isArchived === 'true') {
      query.isArchived = true;
    } else {
      query.isArchived = { $ne: true };
    }

    // Role-based visibility scoping for Team Members
    if (req.user.role === 'Team Member') {
      query.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    } else {
      if (assignedTo) query.assignedTo = assignedTo;
      if (createdBy) query.createdBy = createdBy;
    }

    // Team Filter
    if (team) {
      query.team = team;
    }

    // Recurring Tasks Filter
    if (isRecurring !== undefined) {
      query.isRecurring = isRecurring === 'true';
    }

    // Direct Filters
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // User-specific favorites filter
    if (isFavorite !== undefined && isFavorite === 'true') {
      query.favoritedBy = req.user._id;
    }

    // Tags Filter (supports comma-separated tags or single tag)
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, ''));
      query.tags = { $in: tagList };
    }

    // Date Range Presets & Calendar Range
    const now = new Date();
    if (dateRange === 'today') {
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const endOfToday = new Date(now.setHours(23, 59, 59, 999));
      query.dueDate = { $gte: startOfToday, $lte: endOfToday };
    } else if (dateRange === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      query.dueDate = { $gte: startOfWeek, $lt: endOfWeek };
    } else if (dateRange === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.dueDate = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (dateRange === 'overdue') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'Completed' };
    } else if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Advanced Text & Comment Search
    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };

      // Also search within comments to find matching task IDs
      const matchingComments = await Comment.find({ text: regex }).select('task');
      const taskIdsFromComments = matchingComments.map((c) => c.task);

      const searchConditions = [
        { title: regex },
        { description: regex },
        { tags: regex },
      ];

      if (taskIdsFromComments.length > 0) {
        searchConditions.push({ _id: { $in: taskIdsFromComments } });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Sorting definition
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
    if (sortBy === 'dueDate') sortOptions = { dueDate: 1, createdAt: -1 };
    if (sortBy === 'priority') {
      sortOptions = { priority: 1, createdAt: -1 };
    }
    if (sortBy === 'title') sortOptions = { title: 1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [tasks, totalCount] = await Promise.all([
      Task.find(query)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('archivedBy', 'name email role')
        .populate('team', 'name description')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(query),
    ]);

    const formattedTasks = tasks.map((t) => formatTaskForUser(t, req.user._id));

    return successResponse(res, 200, 'Tasks retrieved successfully', {
      count: formattedTasks.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      tasks: formattedTasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('archivedBy', 'name email role')
      .populate('team', 'name description manager');

    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const assignedId = task.assignedTo?._id ? task.assignedTo._id.toString() : task.assignedTo?.toString();
    const creatorId = task.createdBy?._id ? task.createdBy._id.toString() : task.createdBy?.toString();
    const userId = req.user._id.toString();

    if (
      req.user.role === 'Team Member' &&
      assignedId !== userId &&
      creatorId !== userId
    ) {
      return errorResponse(
        res,
        403,
        'Access denied: You can only view tasks assigned to or created by you'
      );
    }

    const formattedTask = formatTaskForUser(task, req.user._id);

    return successResponse(res, 200, 'Task retrieved successfully', { task: formattedTask });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private (Admin, Manager only)
 */
const createTask = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return errorResponse(
        res,
        403,
        'Forbidden: Only Admins and Managers are authorized to create tasks'
      );
    }

    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      tags,
      team,
      isRecurring,
      recurrence,
    } = req.body;

    if (!title || !title.trim()) {
      return errorResponse(res, 400, 'Task title is required');
    }

    const formattedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
      : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
      : [];

    let recurrenceConfig = {
      frequency: 'None',
      interval: 1,
      startDate: null,
      endDate: null,
      nextRun: null,
    };

    const isRecurringBool = Boolean(isRecurring);

    if (isRecurringBool && recurrence && recurrence.frequency && recurrence.frequency !== 'None') {
      const freq = recurrence.frequency;
      const interval = Math.max(1, parseInt(recurrence.interval, 10) || 1);
      const startDate = recurrence.startDate ? new Date(recurrence.startDate) : new Date();
      const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

      const nextRun = startDate > new Date()
        ? startDate
        : calculateNextRun(freq, interval, new Date());

      recurrenceConfig = {
        frequency: freq,
        interval,
        startDate,
        endDate,
        nextRun,
      };
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user._id,
      assignedTo: assignedTo || null,
      team: team || null,
      status: status || 'To Do',
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      tags: formattedTags,
      isRecurring: isRecurringBool,
      recurrence: recurrenceConfig,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('team', 'name description');

    const formattedTask = formatTaskForUser(populatedTask, req.user._id);

    // 1. Emit Socket Event
    emitTaskCreated(formattedTask);

    // 2. Log Activity
    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'TASK_CREATED',
      description: `${req.user.name || 'User'} created task: "${populatedTask.title}"${isRecurringBool ? ` (Recurring: ${recurrenceConfig.frequency})` : ''}`,
      metadata: { title: populatedTask.title, status: populatedTask.status, priority: populatedTask.priority },
    });

    // 3. Notify Assignee
    if (assignedTo) {
      const assignedUserId = assignedTo.toString();
      emitTaskAssigned(assignedUserId, formattedTask);
      await createNotification({
        userId: assignedUserId,
        message: `You have been assigned to task: "${populatedTask.title}"`,
        type: 'TASK_ASSIGNED',
        taskId: populatedTask._id,
      });

      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'ASSIGNED',
        description: `${req.user.name || 'User'} assigned task to ${populatedTask.assignedTo?.name || 'team member'}`,
        metadata: { assignedTo: populatedTask.assignedTo },
      });
    }

    return successResponse(res, 201, 'Task created successfully', {
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update task details / status (Kanban Move & Field Edits)
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const previousStatus = task.status;
    const previousPriority = task.priority;
    const previousAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    const previousDueDate = task.dueDate ? task.dueDate.toISOString() : null;

    // Authorization & field validation
    if (req.user.role === 'Team Member') {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return errorResponse(
          res,
          403,
          'Forbidden: You can only update tasks assigned directly to you'
        );
      }

      const disallowedFields = ['title', 'description', 'priority', 'assignedTo', 'dueDate', 'tags', 'team', 'isRecurring', 'recurrence'];
      const attemptedDisallowed = disallowedFields.filter(
        (field) => req.body[field] !== undefined
      );

      if (attemptedDisallowed.length > 0) {
        return errorResponse(
          res,
          403,
          `Forbidden: Team Members can only change task status. Cannot edit: ${attemptedDisallowed.join(
            ', '
          )}`
        );
      }

      if (req.body.status) {
        task.status = req.body.status;
      }
    } else {
      // Admin & Manager updates
      if (req.body.title !== undefined) task.title = req.body.title.trim();
      if (req.body.description !== undefined) task.description = req.body.description.trim();
      if (req.body.status !== undefined) task.status = req.body.status;
      if (req.body.priority !== undefined) task.priority = req.body.priority;
      if (req.body.assignedTo !== undefined) task.assignedTo = req.body.assignedTo || null;
      if (req.body.team !== undefined) task.team = req.body.team || null;
      if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
      if (req.body.tags !== undefined) {
        task.tags = Array.isArray(req.body.tags)
          ? req.body.tags.map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
          : typeof req.body.tags === 'string'
          ? req.body.tags.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
          : [];
      }

      // Recurring task updates
      if (req.body.isRecurring !== undefined) {
        task.isRecurring = Boolean(req.body.isRecurring);
      }

      if (req.body.recurrence) {
        const rec = req.body.recurrence;
        const currentRec = task.recurrence || {};
        const freq = rec.frequency || currentRec.frequency || 'None';
        const interval = rec.interval !== undefined ? Math.max(1, parseInt(rec.interval, 10) || 1) : (currentRec.interval || 1);
        const startDate = rec.startDate !== undefined ? (rec.startDate ? new Date(rec.startDate) : null) : currentRec.startDate;
        const endDate = rec.endDate !== undefined ? (rec.endDate ? new Date(rec.endDate) : null) : currentRec.endDate;

        let nextRun = currentRec.nextRun;
        if (task.isRecurring && freq !== 'None') {
          nextRun = calculateNextRun(freq, interval, new Date());
        }

        task.recurrence = {
          frequency: freq,
          interval,
          startDate,
          endDate,
          nextRun,
          lastGeneratedAt: currentRec.lastGeneratedAt || null,
          parentTaskId: currentRec.parentTaskId || null,
        };
      }
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('archivedBy', 'name email role')
      .populate('team', 'name description');

    const formattedTask = formatTaskForUser(updatedTask, req.user._id);
    const actorName = req.user.name || 'User';

    // 1. If Status Changed
    if (req.body.status && req.body.status !== previousStatus) {
      emitTaskMoved(formattedTask);
      emitTaskStatusChanged(formattedTask);

      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'STATUS_CHANGED',
        description: `${actorName} changed status from "${previousStatus}" to "${updatedTask.status}"`,
        metadata: { from: previousStatus, to: updatedTask.status },
      });

      if (
        task.createdBy &&
        task.createdBy.toString() !== req.user._id.toString()
      ) {
        await createNotification({
          userId: task.createdBy.toString(),
          message: `Task "${updatedTask.title}" status changed to "${updatedTask.status}" by ${actorName}`,
          type: 'TASK_STATUS_CHANGED',
          taskId: updatedTask._id,
        });
      }

      if (
        task.assignedTo &&
        task.assignedTo.toString() !== req.user._id.toString() &&
        task.assignedTo.toString() !== task.createdBy?.toString()
      ) {
        await createNotification({
          userId: task.assignedTo.toString(),
          message: `Task "${updatedTask.title}" status changed to "${updatedTask.status}"`,
          type: 'TASK_STATUS_CHANGED',
          taskId: updatedTask._id,
        });
      }
    }

    // 2. If Assignee Changed
    if (
      req.body.assignedTo !== undefined &&
      req.body.assignedTo !== previousAssignee
    ) {
      const newAssigneeId = req.body.assignedTo ? req.body.assignedTo.toString() : null;
      if (newAssigneeId) {
        emitTaskAssigned(newAssigneeId, formattedTask);
        await createNotification({
          userId: newAssigneeId,
          message: `You have been assigned to task: "${updatedTask.title}"`,
          type: 'TASK_ASSIGNED',
          taskId: updatedTask._id,
        });
      }

      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'REASSIGNED',
        description: `${actorName} reassigned task to ${updatedTask.assignedTo?.name || 'Unassigned'}`,
        metadata: { assignedTo: updatedTask.assignedTo },
      });
    }

    // 3. If Priority Changed
    if (req.body.priority && req.body.priority !== previousPriority) {
      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'PRIORITY_CHANGED',
        description: `${actorName} changed priority from "${previousPriority}" to "${updatedTask.priority}"`,
        metadata: { from: previousPriority, to: updatedTask.priority },
      });
    }

    // 4. If Due Date Changed
    const newDueDate = updatedTask.dueDate ? updatedTask.dueDate.toISOString() : null;
    if (req.body.dueDate !== undefined && newDueDate !== previousDueDate) {
      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'DUE_DATE_CHANGED',
        description: `${actorName} updated due date to ${updatedTask.dueDate ? new Date(updatedTask.dueDate).toLocaleDateString() : 'No Due Date'}`,
        metadata: { dueDate: updatedTask.dueDate },
      });
    }

    emitTaskUpdated(formattedTask);

    return successResponse(res, 200, 'Task updated successfully', {
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user-specific favorite/star on task
 * @route   PUT /api/tasks/:id/favorite
 * @access  Private
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const userIdStr = req.user._id.toString();
    const alreadyFavorited = (task.favoritedBy || []).some(
      (id) => id.toString() === userIdStr
    );

    if (alreadyFavorited) {
      task.favoritedBy = task.favoritedBy.filter(
        (id) => id.toString() !== userIdStr
      );
    } else {
      task.favoritedBy = [...(task.favoritedBy || []), req.user._id];
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('team', 'name description');

    const formattedTask = formatTaskForUser(updatedTask, req.user._id);

    return successResponse(res, 200, 'Favorite state toggled', {
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive a task
 * @route   PUT /api/tasks/:id/archive
 * @access  Private (Admin, Manager, Creator)
 */
const archiveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isManagerOrAdmin = req.user.role === 'Admin' || req.user.role === 'Manager';

    if (!isCreator && !isManagerOrAdmin) {
      return errorResponse(res, 403, 'Forbidden: You are not authorized to archive this task');
    }

    task.isArchived = true;
    task.archivedAt = new Date();
    task.archivedBy = req.user._id;
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('archivedBy', 'name email role')
      .populate('team', 'name description');

    const formattedTask = formatTaskForUser(updatedTask, req.user._id);

    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'TASK_ARCHIVED',
      description: `${req.user.name} archived task "${task.title}"`,
    });

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: task.assignedTo.toString(),
        message: `Task "${task.title}" was archived by ${req.user.name}`,
        type: 'TASK_ARCHIVED',
        taskId: task._id,
      });
    }

    emitTaskArchived(formattedTask);

    return successResponse(res, 200, 'Task archived successfully', {
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Restore an archived task
 * @route   PUT /api/tasks/:id/restore
 * @access  Private (Admin, Manager, Creator)
 */
const restoreTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isManagerOrAdmin = req.user.role === 'Admin' || req.user.role === 'Manager';

    if (!isCreator && !isManagerOrAdmin) {
      return errorResponse(res, 403, 'Forbidden: You are not authorized to restore this task');
    }

    task.isArchived = false;
    task.archivedAt = null;
    task.archivedBy = null;
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('team', 'name description');

    const formattedTask = formatTaskForUser(updatedTask, req.user._id);

    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'TASK_RESTORED',
      description: `${req.user.name} restored task "${task.title}"`,
    });

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: task.assignedTo.toString(),
        message: `Task "${task.title}" was restored by ${req.user.name}`,
        type: 'TASK_RESTORED',
        taskId: task._id,
      });
    }

    emitTaskRestored(formattedTask);

    return successResponse(res, 200, 'Task restored successfully', {
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add checklist item
 * @route   POST /api/tasks/:id/checklist
 * @access  Private
 */
const addChecklistItem = async (req, res, next) => {
  try {
    const title = (req.body.title || req.body.text || '').trim();
    if (!title) {
      return errorResponse(res, 400, 'Checklist item title is required');
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    task.checklist.push({
      title: title.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await task.save();

    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'CHECKLIST_UPDATED',
      description: `${req.user.name} added checklist item: "${title.trim()}"`,
      metadata: { action: 'ADD_ITEM', title: title.trim() },
    });

    emitChecklistUpdated(task._id.toString(), task.checklist);

    const formattedTask = formatTaskForUser(task, req.user._id);

    return successResponse(res, 201, 'Checklist item added', {
      checklist: task.checklist,
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update / toggle checklist item
 * @route   PUT /api/tasks/:id/checklist/:itemId
 * @access  Private
 */
const updateChecklistItem = async (req, res, next) => {
  try {
    const { title, completed } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const item = task.checklist.id(req.params.itemId);
    if (!item) {
      return errorResponse(res, 404, 'Checklist item not found');
    }

    if (title !== undefined) item.title = title.trim();
    if (completed !== undefined) item.completed = Boolean(completed);
    item.updatedAt = new Date();

    await task.save();

    const completedCount = task.checklist.filter((i) => i.completed).length;
    const totalCount = task.checklist.length;

    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'CHECKLIST_UPDATED',
      description: `${req.user.name} ${item.completed ? 'completed' : 'unmarked'} "${item.title}" (${completedCount}/${totalCount})`,
      metadata: { itemId: item._id, completed: item.completed },
    });

    emitChecklistUpdated(task._id.toString(), task.checklist);

    const formattedTask = formatTaskForUser(task, req.user._id);

    return successResponse(res, 200, 'Checklist item updated', {
      checklist: task.checklist,
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete checklist item
 * @route   DELETE /api/tasks/:id/checklist/:itemId
 * @access  Private
 */
const deleteChecklistItem = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const item = task.checklist.id(req.params.itemId);
    if (!item) {
      return errorResponse(res, 404, 'Checklist item not found');
    }

    const itemTitle = item.title;
    task.checklist.pull(req.params.itemId);
    await task.save();

    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'CHECKLIST_UPDATED',
      description: `${req.user.name} removed checklist item "${itemTitle}"`,
      metadata: { action: 'DELETE_ITEM', title: itemTitle },
    });

    emitChecklistUpdated(task._id.toString(), task.checklist);

    const formattedTask = formatTaskForUser(task, req.user._id);

    return successResponse(res, 200, 'Checklist item removed', {
      checklist: task.checklist,
      task: formattedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Admin only)
 */
const deleteTask = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return errorResponse(
        res,
        403,
        'Forbidden: Only Admins are authorized to delete tasks'
      );
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const taskId = task._id.toString();
    await task.deleteOne();

    emitTaskDeleted(taskId);

    return successResponse(res, 200, 'Task deleted successfully', {
      id: taskId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleFavorite,
  archiveTask,
  restoreTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  deleteTask,
};
