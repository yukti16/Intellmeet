import api from './api';

export const userService = {
  async getUsers(params = {}) {
    return await api.get('/users', { params });
  },

  async getUserById(id) {
    return await api.get(`/users/${id}`);
  },

  async updateUser(id, data) {
    return await api.put(`/users/${id}`, data);
  },
};
