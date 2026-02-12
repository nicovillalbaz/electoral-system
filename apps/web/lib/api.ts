import axios from 'axios';

const api = axios.create({
  // CORRECCIÓN VITAL: Cambiamos el puerto de respaldo a 4000
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo de sesión expirada
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirigir al login solo si estamos en el navegador
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;