import apiClient from '../api/client';

export const documentService = {
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  getTenantDocuments: async (tenantId) => {
    const response = await apiClient.get(`/tenant/${tenantId}/documents`);
    return response.data.data;
  },

  deleteDocument: async (tenantId, documentId) => {
    const response = await apiClient.delete(`/tenant/${tenantId}/documents/${documentId}`);
    return response.data;
  }
};
