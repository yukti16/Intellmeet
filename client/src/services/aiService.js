import api from './api';

export const aiService = {
  async summarizeText(transcript) {
    return await api.post('/ai/summarize', { transcript });
  },

  async extractActionItems(transcript) {
    return await api.post('/ai/action-items', { transcript });
  },

  async extractKeyPoints(transcript) {
    return await api.post('/ai/key-points', { transcript });
  },

  async getFollowUp(transcript) {
    return await api.post('/ai/follow-up', { transcript });
  },

  async getAIInsights() {
    return await api.get('/ai/insights');
  },
};
