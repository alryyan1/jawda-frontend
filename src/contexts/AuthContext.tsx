// src/types/index.ts (or a dedicated types file)

export interface AuthResponse {
  user: User;
  token: string;
}

// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api'; // Your Axios instance
import type { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: Record<string, any>) => Promise<void>;
  register: (data: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true); // To check initial auth status

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      // Optionally, verify token with backend on initial load
      // For simplicity here, we assume stored token is valid until an API call fails
    }
    setIsLoading(false);
  }, []);

  const fetchUser = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await apiClient.get<User>('/user');
      setUser(response.data);
      localStorage.setItem('authUser', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to fetch user', error);
      // Token might be invalid, clear it
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch user if token exists but user data is not in state (e.g., after page refresh)
  useEffect(() => {
    if (token && !user) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);


  const login = async (credentials: Record<string, any>) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post<AuthResponse>('/login', credentials);
      const { user: userData, token: newToken } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Re-throw to handle in component
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: Record<string, any>) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post<AuthResponse>('/register', data);
      const { user: userData, token: newToken } = response.data;

      setToken(newToken);
      setUser(userData);
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error; // Re-throw to handle in component
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      if (token) {
        await apiClient.post('/logout');
      }
    } catch (error) {
      console.error('Logout failed on server:', error);
      // Still proceed with client-side logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setIsLoading(false);
    }
  };
  return (
    <AuthContext.Provider value={{ 
        user, 
        token, 
        isAuthenticated: !!token && !!user, 
        isLoading, 
        login, 
        register, 
        logout,
        fetchUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};