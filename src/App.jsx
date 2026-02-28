import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AddUser from './pages/admin/AddUser';
import UserList from './pages/admin/UserList';
import ExpiringUsers from './pages/admin/ExpiringUsers';

import UserDashboard from './pages/user/Dashboard';
import Billing from './pages/user/Billing';
import GSTBilling from './pages/user/GSTBilling';
import PurchaseBilling from './pages/user/PurchaseBilling';
import Reports from './pages/user/Reports';
import LedgerManagement from './pages/user/LedgerManagement';
import GSTLedger from './pages/user/GSTLedger';
import LedgerDetail from './pages/user/LedgerDetail';
import Expenses from './pages/user/Expenses';
import AccountInfo from './pages/user/AccountInfo';
import StockManagement from './pages/user/StockManagement';
import Karigar from './pages/user/Karigar';
import ItemReports from './pages/user/ItemReports';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="loading" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!adminOnly && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <Login />}
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/add-user" element={<ProtectedRoute adminOnly><AddUser /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><UserList /></ProtectedRoute>} />
      <Route path="/admin/expiring" element={<ProtectedRoute adminOnly><ExpiringUsers /></ProtectedRoute>} />

      {/* User Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/user/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/gst-billing" element={<ProtectedRoute><GSTBilling /></ProtectedRoute>} />
      <Route path="/user/gst-billing" element={<ProtectedRoute><GSTBilling /></ProtectedRoute>} />
      <Route path="/ledgers" element={<ProtectedRoute><LedgerManagement /></ProtectedRoute>} />
      <Route path="/gst-ledger" element={<ProtectedRoute><GSTLedger /></ProtectedRoute>} />
      <Route path="/ledgers/:id" element={<ProtectedRoute><LedgerDetail /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
      <Route path="/item-reports" element={<ProtectedRoute><ItemReports /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountInfo /></ProtectedRoute>} />
      <Route path="/karigar" element={<ProtectedRoute><Karigar /></ProtectedRoute>} />
      <Route path="/purchase-billing" element={<ProtectedRoute><PurchaseBilling /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
