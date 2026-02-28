import React, { useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { format, differenceInDays } from 'date-fns';
import { FiSun, FiMoon, FiMonitor, FiLock, FiEdit2, FiSave, FiX } from 'react-icons/fi';

export default function AccountInfo() {
  const { user, updateTheme, updateVoucherSettings, logout, theme, updateGSTSettings, updateLabourChargeSettings } = useAuth();
  const [voucherMode, setVoucherMode] = useState(user?.voucherSettings?.autoIncrement ?? true);
  const [labourChargeType, setLabourChargeType] = useState(user?.labourChargeSettings?.type ?? 'full');
  const [editingGST, setEditingGST] = useState(false);
  const [gstFormData, setGstFormData] = useState({
    gstNumber: user?.gstSettings?.gstNumber || '',
    businessState: user?.gstSettings?.businessState || '',
    defaultGSTRate: user?.gstSettings?.defaultGSTRate || 18
  });
  const [savingGST, setSavingGST] = useState(false);

  const indianStates = [
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '25', name: 'Daman and Diu' },
    { code: '26', name: 'Dadra and Nagar Haveli' },
    { code: '27', name: 'Maharashtra' },
    { code: '28', name: 'Andhra Pradesh (Old)' },
    { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh (New)' }
  ];

  // Calculate days remaining properly
  const daysRemaining = useMemo(() => {
    if (!user?.licenseExpiryDate) return 0;
    const expiryDate = new Date(user.licenseExpiryDate);
    const today = new Date();
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

  const handleLabourChargeTypeChange = async (type) => {
    try {
      await updateLabourChargeSettings({ type });
      setLabourChargeType(type);
      toast.success(`Labour charge changed to: ${type === 'full' ? 'Fixed Amount' : 'Per Gram'}`);
    } catch (error) {
      toast.error('Failed to update labour charge settings');
    }
  };

  const handleSaveGST = async () => {
    if (!gstFormData.gstNumber || !gstFormData.businessState) {
      toast.error('GST Number and Business State are required');
      return;
    }

    // Validate GST format: 2 digits (state) + 5 letters (PAN) + 4 digits (entity) + 4 alphanumeric
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z0-9]{4}$/.test(gstFormData.gstNumber)) {
      toast.error('Invalid GST number format (must be 15 characters)');
      return;
    }

    setSavingGST(true);
    try {
      await updateGSTSettings({
        gstSettings: {
          gstNumber: gstFormData.gstNumber,
          businessState: gstFormData.businessState,
          defaultGSTRate: gstFormData.defaultGSTRate
        }
      });

      setEditingGST(false);
      toast.success('GST settings saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save GST settings');
    } finally {
      setSavingGST(false);
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
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>v3.2</span>
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

        {user?.gstEnabled && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>GST Settings ✅</h3>
              {!editingGST && user?.gstSettings?.gstEditPermission !== 'admin' && (
                <button
                  onClick={() => setEditingGST(true)}
                  className="btn btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  <FiEdit2 size={16} /> Edit
                </button>
              )}
            </div>

            {user?.gstSettings?.gstEditPermission === 'admin' && (
              <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                GST settings are managed by admin for this account.
              </div>
            )}

            {editingGST ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    GST Number (15 characters) *
                  </label>
                  <input
                    type="text"
                    value={gstFormData.gstNumber}
                    onChange={(e) => setGstFormData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g., 27AABCS1234H1Z0"
                    maxLength={15}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--color-text)',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Format: 2-digit state code + 5 letters (PAN) + 4 digits (entity) + 4 alphanumeric
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Business State *
                  </label>
                  <select
                    value={gstFormData.businessState}
                    onChange={(e) => setGstFormData(prev => ({ ...prev, businessState: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--color-text)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select a state</option>
                    {indianStates.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Default GST Rate (%) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    {[0, 3, 5, 12, 18].map(rate => (
                      <button
                        key={rate}
                        onClick={() => setGstFormData(prev => ({ ...prev, defaultGSTRate: rate }))}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '4px',
                          border: gstFormData.defaultGSTRate === rate ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                          backgroundColor: gstFormData.defaultGSTRate === rate ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                          color: 'var(--color-text)',
                          cursor: 'pointer',
                          fontWeight: gstFormData.defaultGSTRate === rate ? 600 : 400,
                          transition: 'all 0.2s'
                        }}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleSaveGST}
                    disabled={savingGST}
                    className="btn btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <FiSave size={16} /> {savingGST ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingGST(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <FiX size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-2">
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>GST Number</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {user?.gstSettings?.gstNumber || 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Business State</div>
                  <div style={{ fontWeight: 600 }}>
                    {user?.gstSettings?.businessState ? (
                      indianStates.find(s => s.code === user.gstSettings.businessState)?.name || user.gstSettings.businessState
                    ) : (
                      'Not set'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Default GST Rate</div>
                  <div style={{ fontWeight: 600 }}>{user?.gstSettings?.defaultGSTRate || 'Not set'}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {!user?.gstEnabled && (
          <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem', backgroundColor: 'rgba(102, 126, 234, 0.05)', border: '2px solid #667eea', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#667eea' }}>📋 GST Feature</h3>
              <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                GST is available for implementation
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Please contact admin to enable GST for your account
              </div>
              <div style={{ fontSize: '0.95rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>ಕನ್ನಡದಲ್ಲಿ (In Kannada)</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  GST ಅನುಷ್ಠಾನಕ್ಕಾಗಿ ಲಭ್ಯವಾಗಿದೆ
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ
                </div>
              </div>
            </div>
          </div>
        )}

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
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Icon size={24} color={isActive ? 'var(--color-primary)' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: isActive ? 600 : 400, color: 'var(--color-text)' }}>{option.label}</span>
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

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Labour Charge Configuration</h3>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Choose how labour charges are calculated in billing:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                onClick={() => handleLabourChargeTypeChange('full')}
                style={{
                  padding: '1.5rem',
                  border: `2px solid ${labourChargeType === 'full' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  background: labourChargeType === 'full' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Fixed Amount</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Labour charge stays fixed
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  e.g., ₹15
                </div>
              </button>
              <button
                onClick={() => handleLabourChargeTypeChange('per-gram')}
                style={{
                  padding: '1.5rem',
                  border: `2px solid ${labourChargeType === 'per-gram' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  background: labourChargeType === 'per-gram' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Per Gram</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Labour charge × Gross weight
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  e.g., ₹15 × 5g = ₹75
                </div>
              </button>
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(102, 126, 234, 0.05)',
            borderLeft: '4px solid #667eea',
            borderRadius: '4px'
          }}>
            <p style={{ margin: '0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <strong>Current setting:</strong> Labour charges will be calculated as <strong>{labourChargeType === 'full' ? 'fixed amount' : 'price per gram × gross weight'}</strong>
            </p>
          </div>
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
