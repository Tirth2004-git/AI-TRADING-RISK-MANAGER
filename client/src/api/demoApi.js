import api from './axios.js';

export const demoApi = {
  getStatus: () => api.get('/demo/status'),
  generate: () => api.post('/demo/generate'),
  reset: () => api.delete('/demo/reset', { data: { confirm: true } }),
};
