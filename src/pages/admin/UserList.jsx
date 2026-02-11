import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlusCircle, FiX, FiSave, FiUser } from 'react-icons/fi';
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

  // New states for edit user functionality
  const [editingUserInfo, setEditingUserInfo] = useState(null);
  const [userFormData, setUserFormData] = useState({
    phoneNumber: '',
    password: ''
  });
  const [savingUser, setSavingUser] = useState(false);

  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

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

  const handleDelete = async (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.shopName}"? All their data (ledgers, vouchers, settlements, etc.) will be permanently lost. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(user.id);
          toast.success('User deleted successfully');
          fetchUsers();
        } catch (error) {
          toast.error('Failed to delete user');
        }
      }
    });
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

  // New handlers for edit user functionality
  const handleEditUser = (user) => {
    setEditingUserInfo(user.id);
    setUserFormData({
      phoneNumber: user.phoneNumber,
      password: '' // Start empty for security
    });
  };

  const handleSaveUser = async (userId) => {
    // Validate phone number
    const phoneNumber = userFormData.phoneNumber.replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    setSavingUser(true);
    try {
      const updateData = {
        phoneNumber: phoneNumber
      };

      // Only include password if it's been entered
      if (userFormData.password && userFormData.password.trim() !== '') {
        if (userFormData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSavingUser(false);
          return;
        }
        updateData.password = userFormData.password;
      }

      await adminAPI.updateUser(userId, updateData);
      toast.success('User updated successfully');
      setEditingUserInfo(null);
      setUserFormData({ phoneNumber: '', password: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  // Helper function to format storage size
  const formatStorageSize = (storageUsage) => {
    if (!storageUsage || !storageUsage.totalBytes) {
      return '0 KB';
    }

    const bytes = storageUsage.totalBytes;
    const kb = bytes / 1024;
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else {
      return `${kb.toFixed(2)} KB`;
    }
  };

  // Helper function to format breakdown for tooltip
  const formatBreakdown = (breakdown) => {
    if (!breakdown) return '';

    const formatBytes = (bytes) => {
      const kb = bytes / 1024;
      const mb = bytes / (1024 * 1024);
      if (mb >= 1) return `${mb.toFixed(2)} MB`;
      return `${kb.toFixed(2)} KB`;
    };

    return `Ledgers: ${formatBytes(breakdown.ledgers?.bytes || 0)} (${breakdown.ledgers?.count || 0} entries)
Vouchers: ${formatBytes(breakdown.vouchers?.bytes || 0)} (${breakdown.vouchers?.count || 0} entries)
Settlements: ${formatBytes(breakdown.settlements?.bytes || 0)} (${breakdown.settlements?.count || 0} entries)
Karigars: ${formatBytes(breakdown.karigars?.bytes || 0)} (${breakdown.karigars?.count || 0} entries)
Stock: ${formatBytes(breakdown.stock?.bytes || 0)} (${breakdown.stock?.count || 0} entries)`;
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
                <th>Storage Usage</th>
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
                    <span
                      className="badge badge-info"
                      title={formatBreakdown(user.storageUsage?.breakdown)}
                      style={{ cursor: 'help', fontWeight: 'bold' }}
                    >
                      💾 {formatStorageSize(user.storageUsage)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="btn btn-sm btn-primary"
                        title="Edit User Info"
                      >
                        <FiUser /> Edit
                      </button>
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
                        onClick={() => handleDelete(user)}
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

        {editingUserInfo && (
          <div className="modal-overlay" onClick={() => setEditingUserInfo(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Edit User Information</h3>
                <button
                  onClick={() => setEditingUserInfo(null)}
                  className="btn btn-icon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="input"
                    value={userFormData.phoneNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, phoneNumber: e.target.value })}
                    placeholder="10-digit phone number"
                    maxLength="10"
                  />
                  <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-gray-400)' }}>
                    Must be 10 digits and unique
                  </small>
                </div>

                <div className="input-group">
                  <label className="input-label">New Password (optional)</label>
                  <input
                    type="password"
                    className="input"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="Leave empty to keep current password"
                  />
                  <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-gray-400)' }}>
                    Minimum 6 characters. Leave empty to keep existing password.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setEditingUserInfo(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveUser(editingUserInfo)}
                  disabled={savingUser}
                  className="btn btn-primary"
                >
                  <FiSave /> {savingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
        />
      </div>
    </Layout>
  );
}
