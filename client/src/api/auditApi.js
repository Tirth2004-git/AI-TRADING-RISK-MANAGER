import api from './axios.js';

export const auditApi = {
  list: (params) => api.get('/audit', { params }),
};
