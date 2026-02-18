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
        const userData = response.data.user;
        setUser(userData);
        setTheme(userData.theme || 'system');
        // Update localStorage with latest user data including GST
        localStorage.setItem('user', JSON.stringify(userData));
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
      const response = await authAPI.updateSettings({ theme: newTheme });
      setTheme(newTheme);
      setUser(response.data.user);
      // Persist to localStorage
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user')),
        theme: newTheme
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
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
      const response = await authAPI.updateSettings({ voucherSettings: settings });
      setUser(response.data.user);
      // Persist to localStorage
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user')),
        voucherSettings: response.data.user.voucherSettings
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update voucher settings:', error);
      throw error;
    }
  };

  const updateGSTSettings = async (data) => {
    try {
      const response = await authAPI.updateSettings(data);
      const updatedGSTSettings = response.data.user.gstSettings;
      setUser(prev => ({ 
        ...prev, 
        gstSettings: updatedGSTSettings
      }));
      // Persist to localStorage
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user')),
        gstSettings: updatedGSTSettings
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update GST settings:', error);
      throw error;
    }
  };

  const updateLabourChargeSettings = async (settings) => {
    try {
      const response = await authAPI.updateSettings({ labourChargeSettings: settings });
      setUser(response.data.user);
      // Persist to localStorage
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user')),
        labourChargeSettings: response.data.user.labourChargeSettings
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update labour charge settings:', error);
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
    updateLabourChargeSettings,
    isAdmin: user?.role === 'admin',
    isLicenseExpired: user?.isLicenseExpired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
