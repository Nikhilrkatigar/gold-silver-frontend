import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX } from 'react-icons/fi';
import { isValidGSTFormat, extractStateFromGST } from '../../utils/gstCalculations';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard, SkeletonStat } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';

export default function GSTLedger() {
    const { user } = useAuth();
    const [ledgers, setLedgers] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [filteredLedgers, setFilteredLedgers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingLedger, setEditingLedger] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        ledgerType: 'gst',
        hasGST: false,
        gstNumber: '',
        stateCode: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLedgers();
    }, []);

    useEffect(() => {
        filterLedgers();
    }, [ledgers, startDate, endDate, searchTerm]);

    const fetchLedgers = async () => {
        try {
            setLoading(true);
            const [ledgersRes, vouchersRes] = await Promise.all([
                ledgerAPI.getAll({ type: 'gst' }),
                voucherAPI.getAll()
            ]);
            console.log('🏦 GST Ledger Page - Ledgers fetched:', ledgersRes?.data?.ledgers?.length || 0);
            console.log('📋 Ledger Details:', ledgersRes?.data?.ledgers?.map(l => ({ name: l.name, type: l.ledgerType, hasVouchers: l.hasVouchers })));
            setLedgers(ledgersRes.data.ledgers);
            setVouchers(vouchersRes.data.vouchers || []);
        } catch (error) {
            toast.error('Failed to load GST ledgers');
        } finally {
            setLoading(false);
        }
    };

    const filterLedgers = () => {
        let filtered = [...ledgers];

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(ledger =>
                ledger.name.toLowerCase().includes(searchLower) ||
                (ledger.phoneNumber && ledger.phoneNumber.includes(searchTerm))
            );
        }

        // Apply date range filter
        if (startDate || endDate) {
            filtered = filtered.filter(ledger => {
                const ledgerDate = new Date(ledger.createdAt);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if (start && ledgerDate < start) return false;
                if (end) {
                    const endOfDay = new Date(end);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (ledgerDate > endOfDay) return false;
                }
                return true;
            });
        }

        setFilteredLedgers(filtered);
    };

    const calculateTotals = () => {
        return filteredLedgers.reduce((acc, ledger) => ({
            amount: acc.amount + (ledger.balances?.amount || 0),
            goldFineWeight: acc.goldFineWeight + (ledger.balances?.goldFineWeight || 0),
            silverFineWeight: acc.silverFineWeight + (ledger.balances?.silverFineWeight || 0)
        }), { amount: 0, goldFineWeight: 0, silverFineWeight: 0 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate GST if enabled
        if (formData.hasGST && (!formData.gstNumber || !isValidGSTFormat(formData.gstNumber))) {
            toast.error('Please enter a valid GST number');
            return;
        }

        try {
            const submitData = {
                name: formData.name,
                phoneNumber: formData.phoneNumber,
                ledgerType: 'gst',
                ...(formData.hasGST && {
                    gstDetails: {
                        hasGST: true,
                        gstNumber: formData.gstNumber,
                        stateCode: formData.stateCode
                    }
                })
            };

            if (editingLedger) {
                await ledgerAPI.update(editingLedger._id, submitData);
                toast.success('Ledger updated successfully');
            } else {
                await ledgerAPI.create(submitData);
                toast.success('Ledger created successfully');
            }

            setShowModal(false);
            setFormData({ name: '', phoneNumber: '', ledgerType: 'gst', hasGST: false, gstNumber: '', stateCode: '' });
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
            ledgerType: 'gst',
            hasGST: ledger.gstDetails?.hasGST || false,
            gstNumber: ledger.gstDetails?.gstNumber || '',
            stateCode: ledger.gstDetails?.stateCode || ''
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

    const totals = calculateTotals();

    const handleRefresh = async () => {
        await fetchLedgers();
    };

    return (
        <Layout>
            <PullToRefresh onRefresh={handleRefresh}>
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h1>GST Ledger</h1>
                        <button
                            onClick={() => {
                                setEditingLedger(null);
                                setFormData({
                                    name: '',
                                    phoneNumber: '',
                                    ledgerType: 'gst',
                                    hasGST: false,
                                    gstNumber: '',
                                    stateCode: ''
                                });
                                setShowModal(true);
                            }}
                            className="btn btn-primary"
                        >
                            <FiPlus /> Add GST Ledger
                        </button>
                    </div>

                    {/* Total Amount Card */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
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
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Amount</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#667eea', marginTop: '4px' }}>
                                ₹{(() => {
                                    const ledgerIds = filteredLedgers.map(l => l._id);
                                    const totalAmount = vouchers
                                        .filter(v => {
                                            const vouchLedgerId = typeof v.ledgerId === 'object' ? v.ledgerId?._id : v.ledgerId;
                                            return ledgerIds.includes(vouchLedgerId) && v.invoiceType === 'gst';
                                        })
                                        .reduce((sum, voucher) => {
                                            const itemsTotal = (voucher.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
                                            const stoneAmount = parseFloat(voucher.stoneAmount) || 0;
                                            const fineAmount = parseFloat(voucher.fineAmount) || 0;
                                            return sum + itemsTotal + stoneAmount + fineAmount;
                                        }, 0);
                                    return totalAmount.toFixed(2);
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
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
                                boxSizing: 'border-box',
                                marginRight: '1rem'
                            }}
                        />
                        {searchTerm && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                                Found {filteredLedgers.length} of {ledgers.length} ledgers
                            </div>
                        )}
                    </div>

                    {/* Date Range Filters */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <div className="input-group" style={{ flex: '0 0 auto', maxWidth: '200px' }}>
                            <label className="input-label">Start Date</label>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="input-group" style={{ flex: '0 0 auto', maxWidth: '200px' }}>
                            <label className="input-label">End Date</label>
                            <input
                                type="date"
                                className="input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="btn btn-secondary"
                                style={{ marginTop: '1.5rem' }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>GST Number</th>
                                    <th>Total Transactions</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLedgers.map((ledger) => (
                                    <tr key={ledger._id}>
                                        <td>{ledger.name}</td>
                                        <td>{ledger.phoneNumber}</td>
                                        <td>
                                            {ledger.gstDetails?.hasGST ? (
                                                <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                                    {ledger.gstDetails.gstNumber}
                                                </span>
                                            ) : (
                                                <span className="badge badge-secondary">No GST</span>
                                            )}
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
                                {filteredLedgers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No GST ledgers found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredLedgers.length > 0 && (
                                <tfoot>
                                    <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-secondary)' }}>
                                        <td colSpan="3" style={{ textAlign: 'right', paddingRight: '1rem' }}>Total:</td>
                                        <td>
                                            <div style={{ fontSize: '12px' }}>
                                                <div style={{ color: '#FFD700' }}>Gold: {totals.goldFineWeight.toFixed(3)} g fine</div>
                                                <div style={{ color: '#C0C0C0' }}>Silver: {totals.silverFineWeight.toFixed(3)} g fine</div>
                                            </div>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {showModal && (
                        <div className="modal-overlay" onClick={() => setShowModal(false)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">{editingLedger ? 'Edit GST Ledger' : 'Add New GST Ledger'}</h3>
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
                                            <label className="input-label">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="input"
                                                value={formData.phoneNumber}
                                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '15px', paddingTop: '15px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer', fontSize: '13px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.hasGST}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            hasGST: e.target.checked,
                                                            gstNumber: e.target.checked ? formData.gstNumber : '',
                                                            stateCode: e.target.checked ? formData.stateCode : ''
                                                        });
                                                    }}
                                                    style={{ marginRight: '8px', cursor: 'pointer' }}
                                                />
                                                <span>✅ Customer has GST</span>
                                            </label>

                                            {formData.hasGST && (
                                                <div className="input-group">
                                                    <label className="input-label">GST Number *</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        value={formData.gstNumber}
                                                        onChange={(e) => {
                                                            const gstNum = e.target.value.toUpperCase();
                                                            setFormData({
                                                                ...formData,
                                                                gstNumber: gstNum,
                                                                stateCode: isValidGSTFormat(gstNum) ? extractStateFromGST(gstNum) : ''
                                                            });
                                                        }}
                                                        placeholder="15-digit GST format"
                                                        maxLength="15"
                                                        style={{
                                                            borderColor: formData.gstNumber && !isValidGSTFormat(formData.gstNumber) ? '#ff4757' : 'var(--border-color)',
                                                            borderWidth: formData.gstNumber && !isValidGSTFormat(formData.gstNumber) ? '2px' : '1px'
                                                        }}
                                                    />
                                                    {formData.gstNumber && !isValidGSTFormat(formData.gstNumber) && (
                                                        <small style={{ display: 'block', marginTop: '2px', color: '#ff4757', fontSize: '10px' }}>
                                                            Invalid GST format (expected 15 characters)
                                                        </small>
                                                    )}
                                                    {formData.gstNumber && isValidGSTFormat(formData.gstNumber) && formData.stateCode && (
                                                        <small style={{ display: 'block', marginTop: '2px', color: 'var(--color-success)', fontSize: '10px' }}>
                                                            ✓ Valid GST | State Code: {formData.stateCode}
                                                        </small>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={formData.hasGST && (!formData.gstNumber || !isValidGSTFormat(formData.gstNumber))}
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
