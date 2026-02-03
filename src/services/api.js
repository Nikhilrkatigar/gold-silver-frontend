import axios from 'axios';

// ❌ NO fallback URL — force env correctness
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateSettings: (settings) => api.patch('/auth/settings', settings),
  createAdmin: (data) => api.post('/auth/create-admin', data),
};

// Admin APIs
export const adminAPI = {
  createUser: (userData) => api.post('/admin/users', userData),
  getUsers: () => api.get('/admin/users'),
  getExpiringUsers: () => api.get('/admin/users/expiring'),
  updateUser: (id, updates) => api.patch(`/admin/users/${id}`, updates),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
};

// Ledger APIs
export const ledgerAPI = {
  create: (data) => api.post('/ledger', data),
  getAll: () => api.get('/ledger'),
  getOne: (id) => api.get(`/ledger/${id}`),
  getTransactions: (id, params) =>
    api.get(`/ledger/${id}/transactions`, { params }),
  update: (id, updates) => api.patch(`/ledger/${id}`, updates),
  delete: (id) => api.delete(`/ledger/${id}`),
  deleteAllVouchers: (id) => api.delete(`/ledger/${id}/vouchers`),
};

// Voucher APIs
export const voucherAPI = {
  create: (data) => api.post('/voucher', data),
  getAll: (params) => api.get('/voucher', { params }),
  getDueCredits: () => api.get('/voucher/due-credits'),
  getOne: (id) => api.get(`/voucher/${id}`),
  delete: (id) => api.delete(`/voucher/${id}`),
};

// Settlement APIs
export const settlementAPI = {
  create: (data) => api.post('/settlement', data),
  getAll: (params) => api.get('/settlement', { params }),
  getOne: (id) => api.get(`/settlement/${id}`),
  delete: (id) => api.delete(`/settlement/${id}`),
};

// Stock APIs
export const stockAPI = {
  getStock: () => api.get('/stock'),
  addStock: (data) => api.post('/stock/add', data),
  getHistory: () => api.get('/stock/history'),
  undoStock: () => api.post('/stock/undo'),
};

export default api;
