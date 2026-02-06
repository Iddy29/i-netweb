import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('inet_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line
  }, []);

  const validateToken = async () => {
    try {
      const { data } = await authAPI.getMe();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('inet_user', JSON.stringify(data.data));
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('inet_token', authToken);
    localStorage.setItem('inet_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('inet_token');
    localStorage.removeItem('inet_user');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('inet_user', JSON.stringify(data.data));
      }
    } catch (err) {
      console.error('Refresh user failed', err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
