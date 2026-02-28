import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard, SkeletonStat } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';

export default function LedgerManagement() {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    oldBalAmount: '',
    oldBalGold: '',
    oldBalSilver: ''
  });
  const [loading, setLoading] = useState(true);

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getLedgerDisplayCashBalance = (ledger) => {
    const rawCash = Number(ledger?.balances?.cashBalance);
    const rawCredit = Number(ledger?.balances?.creditBalance);
    const hasSplitBalances = Number.isFinite(rawCash) || Number.isFinite(rawCredit);
    const amountBalance = hasSplitBalances
      ? toFiniteNumber(rawCash) + toFiniteNumber(rawCredit)
      : toFiniteNumber(ledger?.balances?.amount);
    return -amountBalance;
  };

  // "Total Amount" should represent gross billed value only.
  // Ignore settlement vouchers and negative/credit-style entries.
  const getVoucherGrossBillAmount = (voucher) => {
    const paymentType = voucher?.paymentType;
    if (!['cash', 'credit'].includes(paymentType)) return 0;

    const explicitTotal = Number(voucher?.total);
    if (Number.isFinite(explicitTotal)) {
      return explicitTotal > 0 ? explicitTotal : 0;
    }

    const itemsTotal = (voucher?.items || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const stoneAmount = parseFloat(voucher?.stoneAmount) || 0;
    const fineAmount = parseFloat(voucher?.fineAmount) || 0;
    const computedTotal = itemsTotal + stoneAmount + fineAmount;
    return computedTotal > 0 ? computedTotal : 0;
  };

  const formatSignedAmount = (amount) => `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;

  const getVoucherCountForLedger = (ledgerId) => {
    return vouchers.filter(v => {
      const vouchLedgerId = typeof v.ledgerId === 'object' ? v.ledgerId?._id : v.ledgerId;
      return vouchLedgerId === ledgerId;
    }).length;
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const [ledgersRes, vouchersRes] = await Promise.all([
        ledgerAPI.getAll({ type: 'regular' }),
        voucherAPI.getAll()
      ]);
      console.log('📋 Regular Ledgers fetched:', ledgersRes?.data?.ledgers?.length || 0);
      setLedgers(ledgersRes.data.ledgers);
      setVouchers(vouchersRes.data.vouchers || []);
    } catch (error) {
      toast.error('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  };

  // Filter ledgers based on search term
  const filteredLedgers = ledgers.filter(ledger => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ledger.name.toLowerCase().includes(searchLower) ||
      (ledger.phoneNumber && ledger.phoneNumber.includes(searchTerm))
    );
  }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically A-Z

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        ledgerType: 'regular',
        openingBalance: {
          amount: parseFloat(formData.oldBalAmount) || 0,
          goldFineWeight: parseFloat(formData.oldBalGold) || 0,
          silverFineWeight: parseFloat(formData.oldBalSilver) || 0
        }
      };

      if (editingLedger) {
        await ledgerAPI.update(editingLedger._id, submitData);
        toast.success('Ledger updated successfully');
      } else {
        await ledgerAPI.create(submitData);
        toast.success('Ledger created successfully');
      }

      setShowModal(false);
      setFormData({ name: '', phoneNumber: '', oldBalAmount: '', oldBalGold: '', oldBalSilver: '' });
      setEditingLedger(null);
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (ledger) => {
    setEditingLedger(ledger);
    setFormData({
      name: ledger.name,
      phoneNumber: ledger.phoneNumber,
      oldBalAmount: ledger.openingBalance?.amount || '',
      oldBalGold: ledger.openingBalance?.goldFineWeight || '',
      oldBalSilver: ledger.openingBalance?.silverFineWeight || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (ledger) => {
    if (ledger.hasVouchers) {
      toast.error('Cannot delete ledger with existing vouchers');
      return;
    }

    if (!confirm(`Delete ledger "${ledger.name}"?`)) return;

    try {
      await ledgerAPI.delete(ledger._id);
      toast.success('Ledger deleted successfully');
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete ledger');
    }
  };

  const handleRefresh = async () => {
    await fetchLedgers();
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1>Ledger Management</h1>
            <button
              onClick={() => {
                setEditingLedger(null);
                setFormData({
                  name: '',
                  phoneNumber: '',
                  oldBalAmount: '',
                  oldBalGold: '',
                  oldBalSilver: ''
                });
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <FiPlus /> Add Ledger
            </button>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <SkeletonStat count={3} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              {/* Total Ledgers Card */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Ledgers</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6', marginTop: '8px' }}>
                  {filteredLedgers.length}
                </div>
                {searchTerm && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    of {ledgers.length} total
                  </div>
                )}
              </div>

              {/* Total Amount Card */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '2px solid #667eea',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Amount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#667eea', marginTop: '8px' }}>
                  ₹{(() => {
                    const ledgerIds = filteredLedgers.map(l => l._id);

                    const matchingVouchers = vouchers.filter(v => {
                      // Handle both cases: ledgerId as object or string
                      const vouchLedgerId = typeof v.ledgerId === 'object' ? v.ledgerId?._id : v.ledgerId;
                      return ledgerIds.includes(vouchLedgerId);
                    });

                    const totalAmount = matchingVouchers.reduce((sum, voucher) => {
                      return sum + getVoucherGrossBillAmount(voucher);
                    }, 0);

                    return totalAmount.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Balance Amount Card */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '2px solid #f5576c',
                boxShadow: '0 2px 8px rgba(245, 87, 108, 0.1)'
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Balance Amount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f5576c', marginTop: '8px' }}>
                  ₹{formatSignedAmount(filteredLedgers.reduce((sum, ledger) => {
                    return sum + getLedgerDisplayCashBalance(ledger);
                  }, 0))}
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <input
                type="text"
                placeholder="🔍 Search ledgers by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                  Showing {filteredLedgers.length} of {ledgers.length} ledgers
                </div>
              )}
            </div>
            {filteredLedgers.length > 0 && (
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px' }}>
                📊 {filteredLedgers.length} ledger{filteredLedgers.length !== 1 ? 's' : ''} (A-Z sorted)
              </div>
            )}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Cash Balance</th>
                  <th>Balance</th>
                  <th>Total Vouchers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.map((ledger) => (
                  <tr key={ledger._id}>
                    <td>{ledger.name}</td>
                    <td>{ledger.phoneNumber}</td>
                    <td>
                      <span className={`badge ${ledger.ledgerType === 'gst' ? 'badge-success' : 'badge-info'}`}>
                        {ledger.ledgerType === 'gst' ? '📄 GST' : '💰 Regular'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', color: '$var(--color-primary)' }}>
                        ₹{formatSignedAmount(getLedgerDisplayCashBalance(ledger))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                          Gold: {ledger.balances?.goldFineWeight?.toFixed(3) || '0.000'} g fine
                        </div>
                        <div style={{ color: '#C0C0C0', fontWeight: 'bold' }}>
                          Silver: {ledger.balances?.silverFineWeight?.toFixed(3) || '0.000'} g fine
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', color: '#667eea', fontSize: '1.125rem', textAlign: 'center' }}>
                        {getVoucherCountForLedger(ledger._id)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/ledgers/${ledger._id}`} className="btn btn-sm btn-secondary">
                          <FiEye /> View
                        </Link>
                        <button onClick={() => handleEdit(ledger)} className="btn btn-sm btn-secondary">
                          <FiEdit2 />
                        </button>
                        <button onClick={() => handleDelete(ledger)} className="btn btn-sm btn-danger" disabled={ledger.hasVouchers}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">{editingLedger ? 'Edit Ledger' : 'Add New Ledger'}</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn btn-icon"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <FiX size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="input-group">
                      <label className="input-label">Name</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        className="input"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="10 digits (optional)"
                      />
                    </div>

                    {/* Old Balance Fields */}
                    <div style={{ marginTop: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <label className="input-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                        Opening Balance (Optional)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Amount (₹)</label>
                          <input
                            type="number"
                            className="input"
                            value={formData.oldBalAmount}
                            onChange={(e) => setFormData({ ...formData, oldBalAmount: e.target.value })}
                            placeholder="₹0.00"
                            step="0.01"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#FFD700', display: 'block', marginBottom: '3px' }}>Gold Fine (g)</label>
                          <input
                            type="number"
                            className="input"
                            value={formData.oldBalGold}
                            onChange={(e) => setFormData({ ...formData, oldBalGold: e.target.value })}
                            placeholder="0.000g"
                            step="0.001"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#C0C0C0', display: 'block', marginBottom: '3px' }}>Silver Fine (g)</label>
                          <input
                            type="number"
                            className="input"
                            value={formData.oldBalSilver}
                            onChange={(e) => setFormData({ ...formData, oldBalSilver: e.target.value })}
                            placeholder="0.000g"
                            step="0.001"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      {editingLedger ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}


