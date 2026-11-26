import api from './axios.js';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  demo: () => api.post('/auth/demo'),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  me: () => api.get('/auth/me'),
  verifyEmail: (payload) => api.post('/auth/verify-email', payload),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  deleteAccount: (payload) => api.delete('/auth/account', { data: payload }),
};
