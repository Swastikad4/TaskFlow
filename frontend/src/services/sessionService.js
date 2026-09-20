import api from './api';

export const sessionService = {
  getSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data;
  },

  revokeSession: async (sessionId) => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  revokeAllOtherSessions: async () => {
    const response = await api.post('/auth/sessions/revoke-others');
    return response.data;
  },
};
