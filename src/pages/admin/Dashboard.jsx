import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { FiUsers, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      toast.error('Failed to load statistics');
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

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: FiUsers, color: '#3b82f6' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: FiCheckCircle, color: '#10b981' },
    { label: 'Expired Users', value: stats?.expiredUsers || 0, icon: FiXCircle, color: '#ef4444' },
    { label: 'Expiring Soon', value: stats?.expiringUsers || 0, icon: FiClock, color: '#f59e0b' },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: '1200px' }}>
        <h1 style={{ marginBottom: '2rem' }}>Admin Dashboard</h1>

        <div className="grid grid-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color
                  }}>
                    <Icon size={24} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {stat.value}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
