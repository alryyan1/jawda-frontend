// src/services/api.ts (or your existing axios setup)
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Interceptor to handle 401 errors (e.g., redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token might be invalid or expired
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      // Potentially redirect to login, or emit an event
      // window.location.href = '/login'; // Simple redirect
      console.error('Unauthorized, logging out.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;