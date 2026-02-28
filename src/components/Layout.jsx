import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import {
  FiHome, FiUsers, FiClock, FiLogOut, FiMenu, FiX,
  FiDollarSign, FiBook, FiTrendingUp, FiSettings,
  FiFileText, FiShoppingBag, FiBarChart2
} from 'react-icons/fi';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminNav = [
    { path: '/admin', icon: FiHome, label: 'Dashboard' },
    { path: '/admin/add-user', icon: FiUsers, label: 'Add User' },
    { path: '/admin/users', icon: FiBook, label: 'User List' },
    { path: '/admin/expiring', icon: FiClock, label: 'Expiring Soon' },
  ];

  const userNav = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/billing', icon: FiFileText, label: 'Billing' },
    { path: '/gst-billing', icon: FiFileText, label: 'GST Billing', requiresGST: true },
    { path: '/purchase-billing', icon: FiShoppingBag, label: 'Purchase / Old Gold' },
    { path: '/ledgers', icon: FiBook, label: 'Ledgers' },
    { path: '/gst-ledger', icon: FiFileText, label: 'GST Ledger', requiresGST: true },
    { path: '/expenses', icon: FiTrendingUp, label: 'Expenses' },
    { path: '/karigar', icon: FiDollarSign, label: 'Karigar' },
    { path: '/stock', icon: FiDollarSign, label: 'Stock Management' },
    { path: '/item-reports', icon: FiFileText, label: 'Item Reports', requiresItemMode: true },
    { path: '/reports', icon: FiBarChart2, label: 'Reports & Analytics' },
    { path: '/account', icon: FiSettings, label: 'Account' },
  ];

  // Filter navigation items based on user permissions
  const filteredUserNav = userNav.filter(item => {
    // If item requires GST, only show it if user has GST enabled
    if (item.requiresGST) {
      return user?.gstEnabled === true;
    }
    if (item.requiresItemMode) {
      return user?.stockMode === 'item';
    }
    return true;
  });

  const navItems = isAdmin ? adminNav : filteredUserNav;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        transition: 'width 0.3s',
        overflow: 'hidden',
        zIndex: 1000
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                ✨
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.shopName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {isAdmin ? 'Admin' : 'User'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.5rem'
              }}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <nav style={{ padding: '1rem' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
                  background: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'var(--color-danger)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '1rem'
            }}
          >
            <FiLogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? '260px' : '0',
        transition: 'margin-left 0.3s',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-secondary"
            style={{ padding: '0.625rem' }}
          >
            <FiMenu size={20} />
          </button>

          {!isAdmin && user?.daysUntilExpiry <= 7 && (
            <div className="badge badge-warning">
              License expires in {user.daysUntilExpiry} days
            </div>
          )}
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '2rem 1.5rem' }}>
          {children}
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        danger={false}
      />
    </div>
  );
}
