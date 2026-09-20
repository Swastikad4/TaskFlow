import api from './api';

export const attachmentService = {
  // Upload attachment file to a task
  uploadAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all attachments for a task
  getAttachments: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/attachments`);
    return response.data;
  },

  // Delete attachment by ID
  deleteAttachment: async (id) => {
    const response = await api.delete(`/attachments/${id}`);
    return response.data;
  },

  // Get download URL for an attachment
  getDownloadUrl: (id) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${baseUrl}/attachments/${id}/download`;
  },
};
