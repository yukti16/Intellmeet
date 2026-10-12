import api from './api';

export const workspaceService = {
  async getWorkspaces() {
    return await api.get('/workspaces');
  },

  async getWorkspaceById(id) {
    return await api.get(`/workspaces/${id}`);
  },

  async createWorkspace(data) {
    return await api.post('/workspaces', data);
  },

  async updateWorkspace(id, data) {
    return await api.put(`/workspaces/${id}`, data);
  },

  async addMember(workspaceId, memberData) {
    return await api.post(`/workspaces/${workspaceId}/members`, memberData);
  },

  async removeMember(workspaceId, userId) {
    return await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },
};
