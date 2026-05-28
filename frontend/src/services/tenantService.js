import apiClient from '../api/client';

export const tenantService = {
  createTenant: async (tenantData) => {
    const response = await apiClient.post('/tenants', tenantData);
    return response.data.data;
  },

  getTenantMembers: async (tenantId) => {
    const response = await apiClient.get(`/tenant/${tenantId}/members`);
    return response.data.data;
  },

  updateMemberRole: async (tenantId, userId, role) => {
    const response = await apiClient.put(`/tenant/${tenantId}/members/${userId}/role`, { role });
    return response.data;
  }
};
