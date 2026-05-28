import apiClient from '../api/client';

export const authService = {
  signup: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    return response.data.data;
  },
  
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data.data;
  },

  switchWorkspace: async (tenantId) => {
    const response = await apiClient.post('/users/switch-tenant', { tenantId });
    return response.data;
  }
};
