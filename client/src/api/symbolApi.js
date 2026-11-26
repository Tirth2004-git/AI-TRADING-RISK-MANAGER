import api from './axios.js';

export const symbolApi = {
  list: () => api.get('/symbols'),
  create: (payload) => api.post('/symbols', payload),
  update: (id, payload) => api.put(`/symbols/${id}`, payload),
  remove: (id) => api.delete(`/symbols/${id}`),
};
