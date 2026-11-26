import api from './axios.js';

export const ledgerApi = {
  list: () => api.get('/ledger'),
  create: (payload) => api.post('/ledger', payload),
};
