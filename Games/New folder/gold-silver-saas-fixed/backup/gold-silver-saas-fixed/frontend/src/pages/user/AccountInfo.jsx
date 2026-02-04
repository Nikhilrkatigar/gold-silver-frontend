import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

export default function AccountInfo() {
  const { user, updateTheme, updateVoucherSettings, logout, theme } = useAuth();
  const [voucherMode, setVoucherMode] = useState(user?.voucherSettings?.autoIncrement || true);

  const handleThemeChange = async (newTheme) => {
    try {
      await updateTheme(newTheme);
      toast.success('Theme updated successfully');
    } catch (error) {
      toast.error('Failed to update theme');
    }
  };

  const handleVoucherModeChange = async (auto) => {
    try {
      await updateVoucherSettings({ autoIncrement: auto });
      setVoucherMode(auto);
      toast.success('Voucher settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: FiSun },
    { value: 'dark', label: 'Dark', icon: FiMoon },
    { value: 'system', label: 'System', icon: FiMonitor }
  ];

  return (
    <Layout>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Account Information</h1>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Shop Details</h3>
          <div className="grid grid-2">
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Shop Name</div>
              <div style={{ fontWeight: 600 }}>{user?.shopName}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Phone Number</div>
              <div style={{ fontWeight: 600 }}>{user?.phoneNumber}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>License Expires</div>
              <div style={{ fontWeight: 600 }}>{format(new Date(user?.licenseExpiryDate), 'dd MMM yyyy')}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Days Remaining</div>
              <div style={{ fontWeight: 600, color: user?.daysUntilExpiry <= 7 ? 'var(--color-warning)' : 'inherit' }}>
                {user?.daysUntilExpiry} days
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Theme Preference</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    border: `2px solid ${isActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    background: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Icon size={24} color={isActive ? 'var(--color-primary)' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Voucher Number Mode</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => handleVoucherModeChange(true)}
              className={`btn ${voucherMode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              Auto Increment
            </button>
            <button
              onClick={() => handleVoucherModeChange(false)}
              className={`btn ${!voucherMode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              Manual Entry
            </button>
          </div>
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            {voucherMode 
              ? 'Voucher numbers will be automatically incremented'
              : 'You can manually enter voucher numbers'
            }
          </p>
        </div>

        <button onClick={logout} className="btn btn-danger" style={{ width: '100%' }}>
          Logout
        </button>
      </div>
    </Layout>
  );
}
