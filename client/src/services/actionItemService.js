import api from './api';

export const actionItemService = {
  async getActionItems(params = {}) {
    return await api.get('/action-items', { params });
  },

  async createActionItem(data) {
    return await api.post('/action-items', data);
  },

  async updateActionItem(id, data) {
    return await api.put(`/action-items/${id}`, data);
  },

  async deleteActionItem(id) {
    return await api.delete(`/action-items/${id}`);
  },
};
