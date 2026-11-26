import api from './axios.js';

export const tradeApi = {
  analyze: (payload) => api.post('/trades/analyze', payload),
  list: (params) => api.get('/trades', { params }),
  getById: (id) => api.get(`/trades/${id}`),
  create: (payload) => api.post('/trades', payload),
  update: (id, payload) => api.put(`/trades/${id}`, payload),
  remove: (id) => api.delete(`/trades/${id}`),
  addExit: (id, payload) => api.post(`/trades/${id}/exits`, payload),
  close: (id, payload) => api.post(`/trades/${id}/close`, payload),
  moveStop: (id, payload) => api.patch(`/trades/${id}/stop`, payload),
  updateMark: (id, payload) => api.patch(`/trades/${id}/mark`, payload),
  updateJournal: (id, payload) => api.patch(`/trades/${id}/journal`, payload),
  cancel: (id) => api.post(`/trades/${id}/cancel`),
};
