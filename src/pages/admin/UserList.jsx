import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlusCircle, FiX, FiSave } from 'react-icons/fi';
import { format } from 'date-fns';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [extendDays, setExtendDays] = useState('');
  const [editingGST, setEditingGST] = useState(null);
  const [gstFormData, setGstFormData] = useState({
    gstEnabled: false,
    gstEditPermission: 'user'
  });
  const [savingGST, setSavingGST] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user? All their data will be lost.')) return;

    try {
      await adminAPI.deleteUser(id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleExtendLicense = async (userId) => {
    if (!extendDays || extendDays <= 0) {
      toast.error('Please enter valid days');
      return;
    }

    try {
      await adminAPI.updateUser(userId, { licenseDays: parseInt(extendDays) });
      toast.success('License extended successfully');
      setEditingUser(null);
      setExtendDays('');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to extend license');
    }
  };

  const handleEditGST = (user) => {
    setEditingGST(user.id);
    setGstFormData({
      gstEnabled: user.gstEnabled || false,
      gstEditPermission: user.gstSettings?.gstEditPermission || 'user'
    });
  };

  const handleSaveGST = async (userId) => {
    setSavingGST(true);
    try {
      await adminAPI.updateUser(userId, {
        gstEnabled: gstFormData.gstEnabled,
        gstSettings: {
          gstEditPermission: gstFormData.gstEditPermission
        }
      });
      toast.success('GST settings updated successfully');
      setEditingGST(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update GST settings');
    } finally {
      setSavingGST(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading" style={{ width: '40px', height: '40px' }}></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1 style={{ marginBottom: '2rem' }}>User List</h1>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Phone</th>
                <th>License Expiry</th>
                <th>Days Left</th>
                <th>Status</th>
                <th>GST Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.shopName}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{format(new Date(user.licenseExpiryDate), 'dd MMM yyyy')}</td>
                  <td>{user.daysUntilExpiry} days</td>
                  <td>
                    <span className={`badge ${user.isExpired ? 'badge-danger' : 'badge-success'}`}>
                      {user.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.gstEnabled ? 'badge-success' : 'badge-secondary'}`}>
                      {user.gstEnabled ? '✅ GST Enabled' : '❌ Non-GST'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEditGST(user)}
                        className="btn btn-sm btn-info"
                        title="Edit GST Settings"
                      >
                        <FiEdit2 /> GST
                      </button>
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className="btn btn-sm btn-secondary"
                      >
                        <FiPlusCircle /> Extend
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-sm btn-danger"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingUser && (
          <div className="modal-overlay" onClick={() => setEditingUser(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Extend License</h3>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Additional Days</label>
                  <input
                    type="number"
                    className="input"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    min="1"
                    placeholder="Enter days to extend"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setEditingUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={() => handleExtendLicense(editingUser)} className="btn btn-primary">
                  Extend License
                </button>
              </div>
            </div>
          </div>
        )}

        {editingGST && (
          <div className="modal-overlay" onClick={() => setEditingGST(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Edit GST Settings</h3>
                <button
                  onClick={() => setEditingGST(null)}
                  className="btn btn-icon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">
                    <input
                      type="checkbox"
                      checked={gstFormData.gstEnabled}
                      onChange={(e) => setGstFormData({ ...gstFormData, gstEnabled: e.target.checked })}
                    />
                    <span style={{ marginLeft: '0.5rem' }}>Enable GST for this user</span>
                  </label>
                </div>

                {gstFormData.gstEnabled && (
                  <div className="input-group">
                    <label className="input-label">GST Edit Permission</label>
                    <select
                      className="input"
                      value={gstFormData.gstEditPermission}
                      onChange={(e) => setGstFormData({ ...gstFormData, gstEditPermission: e.target.value })}
                    >
                      <option value="user">User can edit GST settings</option>
                      <option value="admin">Admin only (user cannot edit)</option>
                    </select>
                    <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-gray-400)' }}>
                      {gstFormData.gstEditPermission === 'user'
                        ? 'User can update GST number, state, and rate in their Account Info'
                        : 'User cannot change GST settings; admin must update through this panel'}
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setEditingGST(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveGST(editingGST)}
                  disabled={savingGST}
                  className="btn btn-primary"
                >
                  <FiSave /> {savingGST ? 'Saving...' : 'Save GST Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
