/**
 * Socket.IO Real-Time Event Architecture & Initialization
 *
 * Supported Real-Time Events:
 * 1. taskCreated             - Emitted when a new task is created
 * 2. taskUpdated             - Emitted when task fields change
 * 3. taskAssigned            - Emitted to the assigned team member room
 * 4. taskStatusChanged       - Emitted when status changes (To Do -> In Progress -> Completed)
 * 5. taskMoved               - Emitted on Kanban drag-and-drop card movements
 * 6. taskDeleted             - Emitted when a task is deleted
 * 7. commentAdded            - Emitted to the task room when a new comment is posted
 * 8. activityCreated         - Emitted to the task room when an audit activity is recorded
 * 9. notificationCreated     - Emitted to target user room for instant alert
 * 10. recurringTaskGenerated - Emitted when a recurring task creates a new cycle
 * 11. teamCreated            - Emitted when a new team is formed
 * 12. teamUpdated            - Emitted when team details/members change
 * 13. teamDeleted            - Emitted when a team is removed
 * 14. sessionRevoked         - Emitted when a session is revoked to force logout
 * 15. analyticsUpdated       - Emitted when tasks change to refresh active dashboard metrics
 */

let ioInstance = null;

const initSocketIO = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join specific user notification room
    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined user room: user:${userId}`);
      }
    });

    // Join a specific task room for real-time live comments and updates
    socket.on('join_task_room', (taskId) => {
      if (taskId) {
        socket.join(`task:${taskId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined task room: task:${taskId}`);
      }
    });

    // Leave a task room
    socket.on('leave_task_room', (taskId) => {
      if (taskId) {
        socket.leave(`task:${taskId}`);
        console.log(`[Socket.IO] Socket ${socket.id} left task room: task:${taskId}`);
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Helper to get the active Socket.IO server instance
 */
const getIO = () => {
  return ioInstance;
};

/**
 * Real-time event dispatchers
 */
const emitTaskCreated = (task) => {
  if (ioInstance) {
    ioInstance.emit('taskCreated', task);
    ioInstance.emit('analyticsUpdated', { action: 'created', task });
  }
};

const emitTaskUpdated = (task) => {
  if (ioInstance) {
    ioInstance.to(`task:${task._id}`).emit('taskUpdated', task);
    ioInstance.emit('taskUpdated', task);
    ioInstance.emit('analyticsUpdated', { action: 'updated', task });
  }
};

const emitTaskMoved = (task) => {
  if (ioInstance) {
    ioInstance.to(`task:${task._id}`).emit('taskMoved', task);
    ioInstance.emit('taskMoved', task);
    ioInstance.emit('taskStatusChanged', task);
    ioInstance.emit('analyticsUpdated', { action: 'moved', task });
  }
};

const emitTaskAssigned = (userId, task) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit('taskAssigned', task);
  }
};

const emitTaskStatusChanged = (task) => {
  if (ioInstance) {
    ioInstance.to(`task:${task._id}`).emit('taskStatusChanged', task);
    ioInstance.emit('taskStatusChanged', task);
    ioInstance.emit('analyticsUpdated', { action: 'status_changed', task });
  }
};

const emitTaskDeleted = (taskId) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('taskDeleted', { taskId });
    ioInstance.emit('taskDeleted', { taskId });
    ioInstance.emit('analyticsUpdated', { action: 'deleted', taskId });
  }
};

const emitCommentAdded = (taskId, comment) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('commentAdded', comment);
  }
};

const emitActivityCreated = (taskId, activity) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('activityCreated', activity);
  }
};

const emitNotificationCreated = (userId, notification) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit('notificationCreated', notification);
  }
};

const emitAttachmentAdded = (taskId, attachment) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('attachmentAdded', attachment);
    ioInstance.emit('attachmentAdded', attachment);
  }
};

const emitAttachmentDeleted = (taskId, attachmentId) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('attachmentDeleted', { taskId, attachmentId });
    ioInstance.emit('attachmentDeleted', { taskId, attachmentId });
  }
};

const emitChecklistUpdated = (taskId, checklist) => {
  if (ioInstance && taskId) {
    ioInstance.to(`task:${taskId}`).emit('checklistUpdated', { taskId, checklist });
    ioInstance.emit('checklistUpdated', { taskId, checklist });
  }
};

const emitTaskArchived = (task) => {
  if (ioInstance && task) {
    ioInstance.to(`task:${task._id}`).emit('taskArchived', task);
    ioInstance.emit('taskArchived', task);
    ioInstance.emit('analyticsUpdated', { action: 'archived', task });
  }
};

const emitTaskRestored = (task) => {
  if (ioInstance && task) {
    ioInstance.to(`task:${task._id}`).emit('taskRestored', task);
    ioInstance.emit('taskRestored', task);
    ioInstance.emit('analyticsUpdated', { action: 'restored', task });
  }
};

const emitRecurringTaskGenerated = (payload) => {
  if (ioInstance) {
    ioInstance.emit('recurringTaskGenerated', payload);
    ioInstance.emit('analyticsUpdated', { action: 'recurring_generated', payload });
  }
};

const emitTeamCreated = (team) => {
  if (ioInstance) {
    ioInstance.emit('teamCreated', team);
  }
};

const emitTeamUpdated = (team) => {
  if (ioInstance) {
    ioInstance.emit('teamUpdated', team);
  }
};

const emitTeamDeleted = (teamId) => {
  if (ioInstance) {
    ioInstance.emit('teamDeleted', { teamId });
  }
};

const emitSessionRevoked = (userId, payload) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit('sessionRevoked', payload);
  }
};

module.exports = {
  initSocketIO,
  getIO,
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskMoved,
  emitTaskAssigned,
  emitTaskStatusChanged,
  emitTaskDeleted,
  emitCommentAdded,
  emitActivityCreated,
  emitNotificationCreated,
  emitAttachmentAdded,
  emitAttachmentDeleted,
  emitChecklistUpdated,
  emitTaskArchived,
  emitTaskRestored,
  emitRecurringTaskGenerated,
  emitTeamCreated,
  emitTeamUpdated,
  emitTeamDeleted,
  emitSessionRevoked,
};
