import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import Onboarding, { HelpMenu } from './Onboarding';
import { useLang } from '../i18n';
import {
  FiHome, FiUsers, FiClock, FiLogOut, FiMenu, FiX,
  FiBook, FiTrendingUp, FiSettings, FiFileText, FiShoppingBag,
  FiBarChart2, FiPackage, FiTool, FiPercent, FiUserPlus, FiGrid
} from 'react-icons/fi';

const adminNav = [
  { path: '/admin', icon: FiHome, label: 'Dashboard', short: 'Home' },
  { path: '/admin/add-user', icon: FiUserPlus, label: 'Add User', short: 'Add' },
  { path: '/admin/users', icon: FiUsers, label: 'User List', short: 'Users' },
  { path: '/admin/expiring', icon: FiClock, label: 'Expiring Soon', short: 'Expiring' },
];

const userNav = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard', short: 'Home' },
  { path: '/billing', icon: FiFileText, label: 'Billing', short: 'Billing' },
  { path: '/gst-billing', icon: FiPercent, label: 'GST Billing', requiresGST: true },
  { path: '/purchase-billing', icon: FiShoppingBag, label: 'Purchase / Old Gold' },
  { path: '/ledgers', icon: FiBook, label: 'Ledgers', short: 'Ledgers' },
  { path: '/gst-ledger', icon: FiBook, label: 'GST Ledger', requiresGST: true },
  { path: '/expenses', icon: FiTrendingUp, label: 'Expenses' },
  { path: '/karigar', icon: FiTool, label: 'Karigar' },
  { path: '/stock', icon: FiPackage, label: 'Stock', short: 'Stock' },
  { path: '/item-reports', icon: FiGrid, label: 'Item Reports', requiresItemMode: true },
  { path: '/reports', icon: FiBarChart2, label: 'Reports & Analytics' },
  { path: '/account', icon: FiSettings, label: 'Account' },
];

const isActivePath = (pathname, path) => (
  pathname === path || (path !== '/admin' && pathname.startsWith(`${path}/`))
);

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const { t } = useLang();
  const label = (item) => (isAdmin ? item.label : t(`nav.${item.path}`));
  const shortLabel = (item) => (isAdmin ? item.short : t(`short.${item.path}`));

  const navItems = isAdmin ? adminNav : userNav.filter((item) => {
    if (item.requiresGST) return user?.gstEnabled === true;
    if (item.requiresItemMode) return user?.stockMode === 'item';
    return true;
  });
  const tabItems = navItems.filter((item) => item.short);
  const current = navItems.find((item) => isActivePath(pathname, item.path));

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSidebarOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <img src="/favicon.svg" alt="" className="brand-mark" />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">{user?.shopName}</div>
            <div className="sidebar-brand-role">{isAdmin ? 'Admin' : t('nav.role')}</div>
          </div>
          <button type="button" className="btn btn-icon sidebar-close" onClick={closeSidebar} aria-label="Close menu">
            <FiX size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const { path, icon: Icon } = item;
            const active = isActivePath(pathname, path);
            return (
              <Link
                key={path}
                to={path}
                onClick={closeSidebar}
                className={`nav-link${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                data-tour={path}
              >
                <Icon size={18} aria-hidden="true" />
                {label(item)}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-link danger" onClick={() => { closeSidebar(); setShowLogoutConfirm(true); }}>
            <FiLogOut size={18} aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />}

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-secondary btn-icon menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <FiMenu size={20} />
          </button>
          <div className="topbar-title">{current ? label(current) : user?.shopName}</div>
          {!isAdmin && <HelpMenu />}
          {!isAdmin && user?.daysUntilExpiry <= 7 && (
            <span className="badge badge-warning">
              License: {user.daysUntilExpiry}d left
            </span>
          )}
        </header>

        <motion.main
          key={pathname}
          className="page-content"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>

      <nav className="bottom-nav" aria-label="Quick navigation">
        {tabItems.map((item) => {
          const { path, icon: Icon } = item;
          const active = isActivePath(pathname, path);
          return (
            <Link
              key={path}
              to={path}
              className={`bottom-nav-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              {shortLabel(item)}
            </Link>
          );
        })}
        {!isAdmin && (
          <button type="button" className="bottom-nav-item" onClick={() => setSidebarOpen(true)}>
            <FiMenu size={20} aria-hidden="true" />
            {t('nav.more')}
          </button>
        )}
      </nav>

      {!isAdmin && <Onboarding navItems={navItems} setSidebarOpen={setSidebarOpen} />}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title={t('nav.logout')}
        message={t('logout.message')}
        confirmText={t('nav.logout')}
        cancelText={t('logout.cancel')}
        danger={false}
      />
    </div>
  );
}
