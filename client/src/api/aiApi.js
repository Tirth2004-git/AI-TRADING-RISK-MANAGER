import api from './axios.js';

export const aiApi = {
  reviewTrade: (payload) => api.post('/ai/trade-review', payload),
  reviewPortfolio: () => api.post('/ai/portfolio-review'),
  reviewWeekly: () => api.post('/ai/weekly-review'),
};
