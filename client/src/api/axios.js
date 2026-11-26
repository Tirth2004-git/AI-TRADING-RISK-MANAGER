import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 25000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('risk-manager:unauthorized'));
    }
    const serverMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    const enriched = new Error(serverMessage);
    enriched.status = error.response?.status;
    enriched.details = error.response?.data?.error?.details || null;
    return Promise.reject(enriched);
  }
);

export default api;
