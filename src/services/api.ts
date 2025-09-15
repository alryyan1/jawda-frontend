// src/services/api.ts (or your existing axios setup)
import { host, projectFolder, schema } from '@/pages/constants';
import axios from 'axios';
import { toast } from 'sonner';

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

// Interceptor to handle 401/Unauthenticated errors and show global error toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.data?.message === "Unauthenticated.") {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Redirect to login
      window.location.href = '/login';
      
      console.error('Session expired or invalid. Redirecting to login.');
      return Promise.reject(error);
    }

    // Show toast for other API errors
    if (error.response?.status >= 400) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `خطأ في الخادم (${error.response?.status})`;
      
      // Show toast for meaningful error messages
      if (errorMessage && !errorMessage.includes('Network Error')) {
        toast.error(errorMessage);
      } else {
        // Fallback for generic server errors
        toast.error(`خطأ في الخادم (${error.response?.status})`);
      }
    } else if (!error.response) {
      // Network error (no response from server)
      toast.error('خطأ في الاتصال بالخادم - تحقق من اتصال الإنترنت');
    } else {
      // Other errors
      toast.error('حدث خطأ غير متوقع');
    }

    return Promise.reject(error);
  }
);

export default apiClient;