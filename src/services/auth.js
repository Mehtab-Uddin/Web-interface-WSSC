import api from './api';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      throw new Error(response.data.error || 'Login failed');
    } catch (error) {
      // Re-throw the error so it can be caught in the component
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data?.error || error.response.data?.message || 'Login failed');
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Network error. Please try again.');
      } else {
        // Something else happened
        throw error;
      }
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

