import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { karigarAPI, stockAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiTrash2, FiEye, FiPrinter, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function Karigar() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [currentStock, setCurrentStock] = useState({ gold: 0, silver: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState('given');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'given',
    itemName: '',
    metalType: 'gold',
    fineWeight: '',
    chargeAmount: '',
    narration: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchStock();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await karigarAPI.getAll();
      setTransactions(response.data.transactions);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async () => {
    try {
      const response = await stockAPI.getStock();
      setCurrentStock(response.data.stock);
    } catch (error) {
      toast.error('Failed to load stock');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.itemName || !formData.fineWeight) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fineWeight = parseFloat(formData.fineWeight);
    if (fineWeight <= 0) {
      toast.error('Fine weight must be greater than 0');
      return;
    }

    // Check stock if giving
    if (formData.type === 'given') {
      const availableStock = formData.metalType === 'gold' ? currentStock.gold : currentStock.silver;
      if (fineWeight > availableStock) {
        toast.error(`Insufficient ${formData.metalType} stock. Available: ${availableStock.toFixed(3)}g`);
        return;
      }
    }

    try {
      await karigarAPI.create({
        date: formData.date,
        type: formData.type,
        itemName: formData.itemName,
        metalType: formData.metalType,
        fineWeight: fineWeight,
        chargeAmount: formData.chargeAmount ? parseFloat(formData.chargeAmount) : 0,
        narration: formData.narration
      });

      toast.success('Transaction created successfully!');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'given',
        itemName: '',
        metalType: 'gold',
        fineWeight: '',
        chargeAmount: '',
        narration: ''
      });
      fetchTransactions();
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Delete this transaction? (Stock will not be affected)')) return;

    try {
      await karigarAPI.delete(transactionId);
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handlePreviewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowPreview(true);
  };

  const handlePrintTransaction = (transaction) => {
    const printWindow = window.open('', '_blank');
    const transactionHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Karigar Transaction Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .detail-item { margin-bottom: 10px; }
          .label { font-weight: bold; font-size: 0.9rem; color: #666; }
          .value { font-size: 1.1rem; margin-top: 3px; }
          .type-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
          .type-given { background-color: #fee2e2; color: #7f1d1d; }
          .type-received { background-color: #dcfce7; color: #166534; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">${user?.shopName || 'KARIGAR TRANSACTION'}</div>

        <div class="details">
          <div>
            <div class="detail-item">
              <div class="label">Transaction Type</div>
              <div class="value"><span class="type-badge type-${transaction.type}">${transaction.type.toUpperCase()}</span></div>
            </div>
            <div class="detail-item">
              <div class="label">Item Name</div>
              <div class="value">${transaction.itemName}</div>
            </div>
            <div class="detail-item">
              <div class="label">Metal Type</div>
              <div class="value" style="text-transform: capitalize;">${transaction.metalType}</div>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <div class="label">Date</div>
              <div class="value">${new Date(transaction.date).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="detail-item">
              <div class="label">Fine Weight</div>
              <div class="value">${parseFloat(transaction.fineWeight).toFixed(3)} g</div>
            </div>
            ${transaction.chargeAmount ? `
            <div class="detail-item">
              <div class="label">Charge Amount</div>
              <div class="value">₹${parseFloat(transaction.chargeAmount).toFixed(2)}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${transaction.narration ? `
          <div style="margin-top: 20px;">
            <div class="label">Narration</div>
            <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; margin-top: 5px;">
              ${transaction.narration}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center; border-top: 2px solid #000; padding-top: 20px;">
          <p style="margin: 0; font-size: 0.9rem; color: #666;">
            Printed on ${new Date().toLocaleString('en-IN')}
          </p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(transactionHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '32px', marginBottom: '32px', boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Karigar Management</h1>

          {/* Current Stock Display */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '32px',
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px'
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Gold Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                {currentStock.gold.toFixed(3)} g
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Silver Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c0c0c0', marginTop: '4px' }}>
                {currentStock.silver.toFixed(3)} g
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Transaction Type *</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="type"
                    value="given"
                    checked={formData.type === 'given'}
                    onChange={handleInputChange}
                  />
                  <span>Given (Minus from Stock)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="type"
                    value="received"
                    checked={formData.type === 'received'}
                    onChange={handleInputChange}
                  />
                  <span>Received (Add to Stock)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Item Name *</label>
                <input
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder="e.g., Ring, Bracelet"
                  className="input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Metal Type *</label>
                <select
                  name="metalType"
                  value={formData.metalType}
                  onChange={handleInputChange}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Fine Weight (g) *</label>
                <input
                  type="number"
                  name="fineWeight"
                  value={formData.fineWeight}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  className="input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Charge Amount (₹)</label>
                <input
                  type="number"
                  name="chargeAmount"
                  value={formData.chargeAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Narration</label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                className="input"
                style={{ width: '100%', minHeight: '100px', fontFamily: 'inherit' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 600, fontSize: '1rem', borderRadius: 8 }}>
              Add Transaction
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>Transaction History</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No transactions yet
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Date</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Type</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Metal</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Fine (g)</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Charge</th>
                    <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        {new Date(transaction.date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          background: transaction.type === 'given' ? '#fee2e2' : '#dcfce7',
                          color: transaction.type === 'given' ? '#7f1d1d' : '#166534'
                        }}>
                          {transaction.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{transaction.itemName}</td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{transaction.metalType}</td>
                      <td style={{ padding: '12px' }}>{parseFloat(transaction.fineWeight).toFixed(3)}</td>
                      <td style={{ padding: '12px' }}>
                        {transaction.chargeAmount ? `₹${parseFloat(transaction.chargeAmount).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handlePreviewTransaction(transaction)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              border: 'none',
                              borderRadius: '4px',
                              background: 'var(--bg-secondary)',
                              color: 'var(--color-primary)',
                              cursor: 'pointer'
                            }}
                            title="View"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => handlePrintTransaction(transaction)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              border: 'none',
                              borderRadius: '4px',
                              background: 'var(--bg-secondary)',
                              color: 'var(--color-primary)',
                              cursor: 'pointer'
                            }}
                            title="Print"
                          >
                            <FiPrinter size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction._id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.875rem',
                              border: 'none',
                              borderRadius: '4px',
                              background: '#fee2e2',
                              color: '#7f1d1d',
                              cursor: 'pointer'
                            }}
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTransaction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '32px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '8px'
              }}
            >
              <FiX size={20} />
            </button>

            <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: 700 }}>Transaction Details</h2>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Type</div>
              <div style={{
                marginTop: '4px',
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: selectedTransaction.type === 'given' ? '#fee2e2' : '#dcfce7',
                color: selectedTransaction.type === 'given' ? '#7f1d1d' : '#166534'
              }}>
                {selectedTransaction.type.toUpperCase()}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</div>
              <div style={{ marginTop: '4px', fontSize: '1rem' }}>
                {new Date(selectedTransaction.date).toLocaleDateString('en-IN')}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Item Name</div>
              <div style={{ marginTop: '4px', fontSize: '1rem' }}>{selectedTransaction.itemName}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Metal Type</div>
              <div style={{ marginTop: '4px', fontSize: '1rem', textTransform: 'capitalize' }}>
                {selectedTransaction.metalType}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Fine Weight</div>
              <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 600 }}>
                {parseFloat(selectedTransaction.fineWeight).toFixed(3)} g
              </div>
            </div>

            {selectedTransaction.chargeAmount > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Charge Amount</div>
                <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 600 }}>
                  ₹{parseFloat(selectedTransaction.chargeAmount).toFixed(2)}
                </div>
              </div>
            )}

            {selectedTransaction.narration && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Narration</div>
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  lineHeight: '1.5'
                }}>
                  {selectedTransaction.narration}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => handlePrintTransaction(selectedTransaction)}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer' }}
              >
                Print
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}