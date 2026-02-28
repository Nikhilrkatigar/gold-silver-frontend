import axios from 'axios';

// ✅ Dynamic backend URL - supports both local and production
const API_URL = import.meta.env.VITE_API_URL || 'https://gold-silver-backend-hrcq.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const isLoginRequest = error.config?.url?.includes('/api/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
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
  getAll: (params) => api.get('/api/ledger', { params }),
  getOne: (id) => api.get(`/api/ledger/${id}`),
  getTransactions: (id, params) =>
    api.get(`/api/ledger/${id}/transactions`, { params }),
  update: (id, updates) => api.patch(`/api/ledger/${id}`, updates),
  delete: (id) => api.delete(`/api/ledger/${id}`),
  deleteAllVouchers: (id) => api.delete(`/api/ledger/${id}/vouchers`),
  recalculateBalance: (id) => api.post(`/api/ledger/${id}/recalculate-balance`),
  migrateFixTypes: () => api.post('/api/ledger/migrate/fix-ledger-types'),
};

// Voucher APIs
export const voucherAPI = {
  create: (data) => api.post('/api/voucher', data),
  update: (id, data) => api.put(`/api/voucher/${id}`, data),
  getAll: (params) => api.get('/api/voucher', { params }),
  getDueCredits: () => api.get('/api/voucher/due-credits'),
  getOne: (id) => api.get(`/api/voucher/${id}`),
  cancel: (id, data) => api.patch(`/api/voucher/${id}`, data),
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
  getHistory: (params) => api.get('/api/stock/history', { params }),
  undoStock: () => api.post('/api/stock/undo'),
  setDailyRates: (data) => api.put('/api/stock/daily-rates', data),
};

// Karigar APIs
export const karigarAPI = {
  create: (data) => api.post('/api/karigar', data),
  getAll: (params) => api.get('/api/karigar', { params }),
  getOne: (id) => api.get(`/api/karigar/${id}`),
  delete: (id) => api.delete(`/api/karigar/${id}`),
};

// Expense APIs
export const expenseAPI = {
  create: (data) => api.post('/api/expense', data),
  getAll: (params) => api.get('/api/expense', { params }),
  getOne: (id) => api.get(`/api/expense/${id}`),
  update: (id, data) => api.put(`/api/expense/${id}`, data),
  delete: (id) => api.delete(`/api/expense/${id}`),
};

// Category APIs (Item Mode)
export const categoryAPI = {
  create: (data) => api.post('/api/category', data),
  getAll: (params) => api.get('/api/category', { params }),
  getOne: (id) => api.get(`/api/category/${id}`),
  update: (id, data) => api.put(`/api/category/${id}`, data),
  delete: (id) => api.delete(`/api/category/${id}`),
  getStats: (id) => api.get(`/api/category/${id}/stats`),
};

// Item APIs (Item Mode)
export const itemAPI = {
  create: (data) => api.post('/api/item', data),
  getAll: (params) => api.get('/api/item', { params }),
  getOne: (id) => api.get(`/api/item/${id}`),
  update: (id, data) => api.put(`/api/item/${id}`, data),
  delete: (id) => api.delete(`/api/item/${id}`),
  override: (id, data) => api.post(`/api/item/${id}/override`, data),
  getByCode: (code) => api.get(`/api/item/code/${code}`),
  markSoldBatch: (itemIds, invoiceId) => api.post('/api/item/mark-sold/batch', { itemIds, invoiceId }),
};

// Reports — uses existing API endpoints with date range params
export const reportAPI = {
  getVouchers: (params) => api.get('/api/voucher', { params }),
  getExpenses: (params) => api.get('/api/expense', { params }),
  getSettlements: (params) => api.get('/api/settlement', { params }),
  getLedgers: (params) => api.get('/api/ledger', { params }),
  getKarigars: (params) => api.get('/api/karigar', { params }),
};

export default api;

