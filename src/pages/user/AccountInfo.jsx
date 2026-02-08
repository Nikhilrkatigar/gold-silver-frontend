import React, { useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format, differenceInDays, parse } from 'date-fns';
import { FiSun, FiMoon, FiMonitor, FiLock } from 'react-icons/fi';

export default function AccountInfo() {
  const { user, updateTheme, updateVoucherSettings, logout, theme } = useAuth();
  const [voucherMode, setVoucherMode] = useState(user?.voucherSettings?.autoIncrement || true);

  // Calculate days remaining properly
  const daysRemaining = useMemo(() => {
    if (!user?.licenseExpiryDate) return 0;
    const expiryDate = new Date(user.licenseExpiryDate);
    const today = new Date();
    // Reset time to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    const days = differenceInDays(expiryDate, today);
    return Math.max(0, days);
  }, [user?.licenseExpiryDate]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>Account Information</h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>v1.5</span>
        </div>

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
              <div style={{ fontWeight: 600, color: daysRemaining <= 7 ? 'var(--color-warning)' : 'inherit' }}>
                {daysRemaining} days
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem', position: 'relative', opacity: 0.7 }}>
          <div style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-warning)'
          }}>
            <FiLock size={14} />
            Coming Soon
          </div>
          <h3 style={{ marginBottom: '1.5rem' }}>GST Settings</h3>
          <div className="grid grid-2">
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>GST Number</div>
              <div style={{ fontWeight: 600, opacity: 0.5 }}>-</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>GST Rate (%)</div>
              <div style={{ fontWeight: 600, opacity: 0.5 }}>-</div>
            </div>
          </div>
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.875rem', fontStyle: 'italic' }}>
            GST configuration and invoice generation features will be available soon.
          </p>
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

        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderTop: '2px solid var(--color-primary)' }}>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Built and Developed by</p>
          <h4 style={{ margin: '0.5rem 0', fontWeight: 600 }}>Katigar Softwares</h4>
          <a href="tel:8904286980" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            📞 8904286980
          </a>
        </div>

        <button onClick={logout} className="btn btn-danger" style={{ width: '100%' }}>
          Logout
        </button>
      </div>
    </Layout>
  );
}
