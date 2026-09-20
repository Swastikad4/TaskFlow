import api from './api';

export const tagService = {
  // Get all reusable tags
  getTags: async () => {
    const response = await api.get('/tags');
    return response.data;
  },

  // Create new tag
  createTag: async (tagData) => {
    const response = await api.post('/tags', tagData);
    return response.data;
  },

  // Delete tag (Admin/Manager)
  deleteTag: async (id) => {
    const response = await api.delete(`/tags/${id}`);
    return response.data;
  },
};
