import api from './axios.js';

export const analyticsApi = {
  getAnalytics: () => api.get('/analytics'),
};
