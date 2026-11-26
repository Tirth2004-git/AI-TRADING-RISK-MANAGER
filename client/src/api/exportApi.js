import api from './axios.js';

export const exportApi = {
  exportAll: () => api.get('/export'),
};
