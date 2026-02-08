import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data.user);
        setTheme(response.data.user.theme || 'system');
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    setUser(user);
    setTheme(user.theme || 'system');
    
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateTheme = async (newTheme) => {
    try {
      await authAPI.updateSettings({ theme: newTheme });
      setTheme(newTheme);
      setUser(prev => ({ ...prev, theme: newTheme }));
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement;
    
    if (selectedTheme === 'dark') {
      root.classList.add('dark');
    } else if (selectedTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const updateVoucherSettings = async (settings) => {
    try {
      await authAPI.updateSettings({ voucherSettings: settings });
      setUser(prev => ({ 
        ...prev, 
        voucherSettings: { ...prev.voucherSettings, ...settings }
      }));
    } catch (error) {
      console.error('Failed to update voucher settings:', error);
      throw error;
    }
  };

  const updateGSTSettings = async (data) => {
    try {
      await authAPI.updateSettings(data);
      setUser(prev => ({ 
        ...prev, 
        gstSettings: { ...prev.gstSettings, ...data.gstSettings }
      }));
    } catch (error) {
      console.error('Failed to update GST settings:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    theme,
    login,
    logout,
    updateTheme,
    updateVoucherSettings,
    updateGSTSettings,
    isAdmin: user?.role === 'admin',
    isLicenseExpired: user?.isLicenseExpired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
