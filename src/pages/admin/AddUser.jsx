import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiSave, FiUser, FiPhone, FiLock, FiClock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function AddUser() {
  const [formData, setFormData] = useState({
    shopName: '',
    phoneNumber: '',
    password: '',
    licenseDays: '30'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await adminAPI.createUser(formData);
      toast.success('User created successfully!');
      setFormData({ shopName: '', phoneNumber: '', password: '', licenseDays: '30' });
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
