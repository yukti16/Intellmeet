import api from './api';

export const meetingService = {
  async getMeetings(params = {}) {
    return await api.get('/meetings', { params });
  },

  async getMeetingById(idOrCode) {
    return await api.get(`/meetings/${idOrCode}`);
  },

  async createMeeting(data) {
    return await api.post('/meetings', data);
  },

  async joinMeeting(idOrCode) {
    return await api.post(`/meetings/${idOrCode}/join`);
  },

  async endMeeting(id, data = {}) {
    return await api.post(`/meetings/${id}/end`, data);
  },

  async updateMeeting(id, data) {
    return await api.put(`/meetings/${id}`, data);
  },

  async deleteMeeting(id) {
    return await api.delete(`/meetings/${id}`);
  },

  async getMessages(meetingId) {
    return await api.get(`/meetings/${meetingId}/messages`);
  },

  async sendMessage(meetingId, data) {
    return await api.post(`/meetings/${meetingId}/messages`, data);
  },
};
