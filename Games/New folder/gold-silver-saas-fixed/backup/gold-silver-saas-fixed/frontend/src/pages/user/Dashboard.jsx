import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';

export default function UserDashboard() {
  const [dueCredits, setDueCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDueCredits();
  }, []);

  const fetchDueCredits = async () => {
    try {
      const response = await voucherAPI.getDueCredits();
      setDueCredits(response.data.dueCredits);
    } catch (error) {
      toast.error('Failed to load due credits');
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
        <h1 style={{ marginBottom: '2rem' }}>Credit Bills Due Today</h1>

        {dueCredits.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">No credit bills due today</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Amount Balance</th>
                  <th>Gold Fine Weight</th>
                  <th>Silver Fine Weight</th>
                </tr>
              </thead>
              <tbody>
                {dueCredits.map((credit, index) => (
                  <tr key={index}>
                    <td>{credit.name}</td>
                    <td>{credit.phoneNumber}</td>
                    <td>₹{credit.balanceAmount?.toFixed(2) || '0.00'}</td>
                    <td>{credit.goldFineWeight?.toFixed(3) || '0.000'} g</td>
                    <td>{credit.silverFineWeight?.toFixed(3) || '0.000'} g</td>
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
