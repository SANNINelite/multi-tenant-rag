import apiClient from '../api/client';

export const chatService = {
  askQuestion: async (conversationId, query) => {
    const response = await apiClient.post(`/chat/ask/${conversationId}`, { query });
    return response.data;
  }
};
