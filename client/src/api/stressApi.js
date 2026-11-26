import api from './axios.js';

export const stressApi = {
  runStress: (payload) => api.post('/risk/stress', payload),
  runMonteCarlo: (payload) => api.post('/risk/montecarlo', payload),
  getAdvanced: (params) => api.get('/risk/advanced', { params }),
  runCorrelation: (payload) => api.post('/risk/correlation', payload),
};
