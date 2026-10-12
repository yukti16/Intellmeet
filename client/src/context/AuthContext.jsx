import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('intellmeet_token');
      if (!token) {
        localStorage.removeItem('intellmeet_user');
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem('intellmeet_user', JSON.stringify(res.user));
        } else {
          throw new Error('Invalid user payload');
        }
      } catch (err) {
        console.warn('[AuthContext] Session token validation failed:', err.message);
        localStorage.removeItem('intellmeet_token');
        localStorage.removeItem('intellmeet_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('intellmeet_token');
      localStorage.removeItem('intellmeet_user');
      setUser(null);
    }
  };

  const updateUserProfile = (updatedData) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedData };
      localStorage.setItem('intellmeet_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
        isAuthenticated: !!user && !!localStorage.getItem('intellmeet_token'),
        isAdmin: user?.role === 'Admin',
        isManager: user?.role === 'Manager' || user?.role === 'Admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
