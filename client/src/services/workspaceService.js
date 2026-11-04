import api from './api';

export const workspaceService = {
  async getWorkspaces(params = {}) {
    return await api.get('/workspaces', { params });
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

  async deleteWorkspace(id) {
    return await api.delete(`/workspaces/${id}`);
  },

  async getEligibleUsers(workspaceId, params = {}) {
    return await api.get(`/workspaces/${workspaceId}/eligible-users`, { params });
  },

  async inviteMember(workspaceId, inviteData) {
    return await api.post(`/workspaces/${workspaceId}/invitations`, inviteData);
  },

  async cancelInvitation(workspaceId, inviteId) {
    return await api.delete(`/workspaces/${workspaceId}/invitations/${inviteId}`);
  },

  async addMember(workspaceId, memberData) {
    return await api.post(`/workspaces/${workspaceId}/members`, memberData);
  },

  async updateMemberRole(workspaceId, userId, role) {
    return await api.put(`/workspaces/${workspaceId}/members/${userId}`, { role });
  },

  async removeMember(workspaceId, userId) {
    return await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  async addResource(workspaceId, resourceData) {
    return await api.post(`/workspaces/${workspaceId}/resources`, resourceData);
  },

  async deleteResource(workspaceId, resourceId) {
    return await api.delete(`/workspaces/${workspaceId}/resources/${resourceId}`);
  },
};
