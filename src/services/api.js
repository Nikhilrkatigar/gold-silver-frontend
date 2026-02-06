import axios from 'axios';

// ✅ Dynamic backend URL - supports both local and production
const API_URL = import.meta.env.VITE_API_URL || 'https://gold-silver-backend-hrcq.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', API_URL);

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---------- APIs ----------

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  getMe: () => api.get('/api/auth/me'),
  updateSettings: (settings) => api.patch('/api/auth/settings', settings),
  createAdmin: (data) => api.post('/api/auth/create-admin', data),
};

// Admin APIs
export const adminAPI = {
  createUser: (userData) => api.post('/api/admin/users', userData),
  getUsers: () => api.get('/api/admin/users'),
  getExpiringUsers: () => api.get('/api/admin/users/expiring'),
  updateUser: (id, updates) => api.patch(`/api/admin/users/${id}`, updates),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  getStats: () => api.get('/api/admin/stats'),
};

// Ledger APIs
export const ledgerAPI = {
  create: (data) => api.post('/api/ledger', data),
  getAll: () => api.get('/api/ledger'),
  getOne: (id) => api.get(`/api/ledger/${id}`),
  getTransactions: (id, params) =>
    api.get(`/api/ledger/${id}/transactions`, { params }),
  update: (id, updates) => api.patch(`/api/ledger/${id}`, updates),
  delete: (id) => api.delete(`/api/ledger/${id}`),
  deleteAllVouchers: (id) => api.delete(`/api/ledger/${id}/vouchers`),
  recalculateBalance: (id) => api.post(`/api/ledger/${id}/recalculate-balance`),
};

// Voucher APIs
export const voucherAPI = {
  create: (data) => api.post('/api/voucher', data),
  getAll: (params) => api.get('/api/voucher', { params }),
  getDueCredits: () => api.get('/api/voucher/due-credits'),
  getOne: (id) => api.get(`/api/voucher/${id}`),
  delete: (id) => api.delete(`/api/voucher/${id}`),
};

// Settlement APIs
export const settlementAPI = {
  create: (data) => api.post('/api/settlement', data),
  getAll: (params) => api.get('/api/settlement', { params }),
  getOne: (id) => api.get(`/api/settlement/${id}`),
  delete: (id) => api.delete(`/api/settlement/${id}`),
};

// Stock APIs
export const stockAPI = {
  getStock: () => api.get('/api/stock'),
  addStock: (data) => api.post('/api/stock/add', data),
  getHistory: () => api.get('/api/stock/history'),
  undoStock: () => api.post('/api/stock/undo'),
};

// Karigar APIs
export const karigarAPI = {
  create: (data) => api.post('/api/karigar', data),
  getAll: (params) => api.get('/api/karigar', { params }),
  getOne: (id) => api.get(`/api/karigar/${id}`),
  delete: (id) => api.delete(`/api/karigar/${id}`),
};

export default api;
