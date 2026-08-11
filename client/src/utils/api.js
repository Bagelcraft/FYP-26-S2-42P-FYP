import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    // The organisation was suspended while this session was open. Every
    // tenant-scoped route now 403s, so stop and explain rather than letting the
    // user click through a UI that can no longer load anything.
    if (error.response?.status === 403 && error.response?.data?.code === 'ORG_SUSPENDED'
        && window.location.pathname !== '/suspended') {
      window.location.href = '/suspended';
    }
    return Promise.reject(error);
  }
);

export default api;
