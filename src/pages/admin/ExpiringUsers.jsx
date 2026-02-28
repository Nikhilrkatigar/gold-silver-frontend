import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function ExpiringUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringUsers();
  }, []);

  const fetchExpiringUsers = async () => {
    try {
      const response = await adminAPI.getExpiringUsers();
      setUsers(response.data.users);
    } catch (error) {
      toast.error('Failed to load expiring users');
    } finally {
      setLoading(false);
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
        <h1 style={{ marginBottom: '2rem' }}>Soon Expiring Shops</h1>

        {users.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">No shops expiring in the next 7 days</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Phone</th>
                  <th>License Expiry</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.shopName}</td>
                    <td>{user.phoneNumber}</td>
                    <td>{format(new Date(user.licenseExpiryDate), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${user.daysUntilExpiry <= 3 ? 'badge-danger' : 'badge-warning'}`}>
                        {user.daysUntilExpiry} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
