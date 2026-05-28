import apiClient from '../api/client';

export const conversationService = {
  createConversation: async (documentIds) => {
    // If it's a string, wrap in array or pass as is
    const payload = Array.isArray(documentIds) ? { documentIds } : { documentId: documentIds };
    const response = await apiClient.post('/conversations/create', payload);
    return response.data;
  },
  
  getConversations: async () => {
    const response = await apiClient.get('/conversations');
    return response.data;
  },

  addDocumentsToConversation: async (conversationId, documentIds) => {
    const response = await apiClient.post(`/conversations/${conversationId}/add-documents`, { documentIds });
    return response.data;
  },

  updateConversation: async (conversationId, title) => {
    const response = await apiClient.put(`/conversations/${conversationId}`, { title });
    return response.data;
  }
};
