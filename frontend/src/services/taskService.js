import api from './api';

export const taskService = {
  // Get all tasks with optional query filters (status, priority, assignedTo, createdBy, tags, isFavorite, isArchived, search, dateRange, sortBy, page, limit)
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // Get task by ID
  getTaskById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  // Create new task
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  // Toggle user-specific favorite / star status on task
  toggleFavorite: async (id) => {
    const response = await api.put(`/tasks/${id}/favorite`);
    return response.data;
  },

  // Archive task
  archiveTask: async (id) => {
    const response = await api.put(`/tasks/${id}/archive`);
    return response.data;
  },

  // Restore archived task
  restoreTask: async (id) => {
    const response = await api.put(`/tasks/${id}/restore`);
    return response.data;
  },

  // Delete task (Admin only)
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // Checklist subtask methods
  addChecklistItem: async (taskId, itemData) => {
    const response = await api.post(`/tasks/${taskId}/checklist`, itemData);
    return response.data;
  },

  updateChecklistItem: async (taskId, itemId, itemData) => {
    const response = await api.put(`/tasks/${taskId}/checklist/${itemId}`, itemData);
    return response.data;
  },

  deleteChecklistItem: async (taskId, itemId) => {
    const response = await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
    return response.data;
  },

  // Get comments for a task
  getComments: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  // Add comment to task
  addComment: async (taskId, commentData) => {
    const response = await api.post(`/tasks/${taskId}/comments`, commentData);
    return response.data;
  },

  // Get activity timeline for a task
  getActivities: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/activities`);
    return response.data;
  },
};
