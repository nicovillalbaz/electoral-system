import axios from 'axios';

function resolveApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  const apiPort = process.env.NEXT_PUBLIC_API_PORT || '4000';

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${apiPort}`;
  }

  return `http://localhost:${apiPort}`;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = config.baseURL || resolveApiBaseUrl();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = String(error.config?.url || '');
      const isLoginRequest = requestUrl.includes('/auth/login');

      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
