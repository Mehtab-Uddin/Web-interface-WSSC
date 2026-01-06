import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.webypixels.com/api' : 'http://localhost:3000/api');
const BASE_URL = import.meta.env.BASE_URL || '/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      const loginPath = `${BASE_URL}login`.replace(/\/+/g, '/'); // Normalize path
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === loginPath || currentPath.endsWith('/login');
      
      if (!isLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use window.location with base path to preserve subdirectory
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

