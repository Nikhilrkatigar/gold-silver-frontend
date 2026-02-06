import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import { format } from 'date-fns';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [extendDays, setExtendDays] = useState('');

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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      </div>
    </Layout>
  );
}
