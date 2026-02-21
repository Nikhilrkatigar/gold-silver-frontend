import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiSave, FiUser, FiPhone, FiLock, FiClock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';

export default function AddUser() {
  const [formData, setFormData] = useState({
    shopName: '',
    phoneNumber: '',
    password: '',
    licenseDays: '30',
    stockMode: 'bulk',
    gstEnabled: false,
    gstEditPermission: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        shopName: formData.shopName,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        licenseDays: formData.licenseDays,
        stockMode: formData.stockMode,
        gstEnabled: formData.gstEnabled,
        gstSettings: {
          gstEditPermission: formData.gstEditPermission,
          defaultGSTRate: 18
        }
      };
      
      await adminAPI.createUser(submitData);
      toast.success('User created successfully!');
      setFormData({
        shopName: '',
        phoneNumber: '',
        password: '',
        licenseDays: '30',
        stockMode: 'bulk',
        gstEnabled: false,
        gstEditPermission: 'user'
      });
      setShowPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Add New User</h1>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">
                <FiUser style={{ display: 'inline', marginRight: '0.5rem' }} />
                Shop Name
              </label>
              <input
                type="text"
                name="shopName"
                className="input"
                value={formData.shopName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <FiPhone style={{ display: 'inline', marginRight: '0.5rem' }} />
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                className="input"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <FiLock style={{ display: 'inline', marginRight: '0.5rem' }} />
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0',
                    fontSize: '1rem'
                  }}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">
                <FiClock style={{ display: 'inline', marginRight: '0.5rem' }} />
                License Duration (Days)
              </label>
              <input
                type="number"
                name="licenseDays"
                className="input"
                value={formData.licenseDays}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                📦 Stock Management Mode
              </label>
              <select
                name="stockMode"
                className="input"
                value={formData.stockMode}
                onChange={handleChange}
              >
                <option value="bulk">Bulk Mode (Traditional) - Track gold/silver in bulk</option>
                <option value="item">Item-wise Mode (Advanced) - Track individual items with QR codes</option>
              </select>
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                {formData.stockMode === 'bulk'
                  ? 'User will track stock as bulk quantities (gold in grams, silver in grams)'
                  : 'User will track individual items with QR codes, categories, and detailed audits'
                }
              </small>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>GST Settings</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    name="gstEnabled"
                    checked={formData.gstEnabled}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Enable GST for this user?</span>
                </label>
                <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  If enabled, user can create GST invoices
                </small>
              </div>

              {formData.gstEnabled && (
                <div>
                  <label className="input-label">GST Edit Permission</label>
                  <select
                    name="gstEditPermission"
                    className="input"
                    value={formData.gstEditPermission}
                    onChange={handleChange}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <option value="user">👤 User can edit their GST settings</option>
                    <option value="admin">🔐 Admin only (user cannot edit)</option>
                  </select>
                  <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
                    {formData.gstEditPermission === 'user'
                      ? 'User can update their GST number, state, and rate'
                      : 'Only you (admin) can modify this user\'s GST settings'
                    }
                  </small>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="loading"></span> : <FiSave />}
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
