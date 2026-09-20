import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('taskflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate and refresh user profile on initial load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('taskflow_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res?.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('taskflow_user', JSON.stringify(res.data.user));
          }
        } catch (error) {
          console.warn('[AuthContext] Session invalid or server unreachable');
          // If 401, clear storage
          if (error.response && error.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    if (response?.data?.user && response?.data?.token) {
      setUser(response.data.user);
      setToken(response.data.token);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response?.data?.user && response?.data?.token) {
      setUser(response.data.user);
      setToken(response.data.token);
    }
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
