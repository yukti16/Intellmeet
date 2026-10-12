import api from './api';

export const authService = {
  async register(userData) {
    const data = await api.post('/auth/register', userData);
    if (data.token) {
      localStorage.setItem('intellmeet_token', data.token);
      localStorage.setItem('intellmeet_user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(credentials) {
    const data = await api.post('/auth/login', credentials);
    if (data.token) {
      localStorage.setItem('intellmeet_token', data.token);
      localStorage.setItem('intellmeet_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    return await api.get('/auth/me');
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('intellmeet_token');
      localStorage.removeItem('intellmeet_user');
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('intellmeet_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
