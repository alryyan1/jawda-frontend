// src/services/api.ts (or your existing axios setup)
import { host, projectFolder, schema } from '@/pages/constants';
import axios from 'axios';

const API_BASE_URL = `${schema}://${host}/${projectFolder}/public/api`;

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

// Interceptor to handle 401/Unauthenticated errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (

      error.response?.data?.message === "Unauthenticated."
    ) {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Redirect to login
      window.location.href = '/login';
      
      console.error('Session expired or invalid. Redirecting to login.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;