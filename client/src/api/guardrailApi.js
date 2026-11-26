import api from './axios.js';

export const guardrailApi = {
  getStatus: () => api.get('/guardrails/status'),
};
