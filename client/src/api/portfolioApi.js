import api from './axios.js';

export const portfolioApi = {
  getSummary: () => api.get('/portfolio/summary'),
  getPerformance: () => api.get('/portfolio/performance'),
};
