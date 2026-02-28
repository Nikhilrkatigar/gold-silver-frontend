import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { expenseAPI, ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiSave, FiTrash2, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { SkeletonCard, SkeletonStat, SkeletonTable } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';
import ConfirmDialog from '../../components/ConfirmDialog';

const EXPENSE_CATEGORIES = [
    { value: 'petrol', label: 'Petrol' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'water', label: 'Water Bill' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'rent', label: 'Rent' },
    { value: 'license', label: 'License Maintenance' },
    { value: 'miscellaneous', label: 'Miscellaneous' }
];

export default function Expenses() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [cashInHand, setCashInHand] = useState(0);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'petrol',
        amount: '',
        description: '',
        paymentMethod: 'cash'
    });
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        paymentMethod: ''
    });
    const [loading, setLoading] = useState(true);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [cashWarningOpen, setCashWarningOpen] = useState(false);
    const [pendingExpenseData, setPendingExpenseData] = useState(null);

    useEffect(() => {
        fetchExpenses();
        calculateCashInHand();
    }, [filters]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.category) params.category = filters.category;
            if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;

            const response = await expenseAPI.getAll(params);
            setExpenses(response.data.expenses);
        } catch (error) {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const calculateCashInHand = async () => {
        try {
            const [ledgersRes, vouchersRes, expensesRes] = await Promise.all([
                ledgerAPI.getAll(),
                voucherAPI.getAll(),
                expenseAPI.getAll()
            ]);

            const allLedgers = ledgersRes.data.ledgers || [];
            const allVouchers = vouchersRes.data.vouchers || [];
            const allExpenses = expensesRes.data.expenses || [];

            const totalVoucherAmount = allVouchers.reduce((sum, voucher) => {
                const amount = parseFloat(voucher.items?.reduce((itemSum, item) => itemSum + (parseFloat(item.amount) || 0), 0) || 0);
                const stoneAmount = parseFloat(voucher.stoneAmount || 0);
                const roundOff = parseFloat(voucher.roundOff || 0);
                const cashReceived = parseFloat(voucher.cashReceived || 0);
                const balance = amount + stoneAmount + roundOff - cashReceived;
                return sum + balance;
            }, 0);

            const totalLedgerBalance = allLedgers.reduce((sum, ledger) => {
                const creditBalance = parseFloat(ledger.balances?.creditBalance || 0);
                const cashBalance = parseFloat(ledger.balances?.cashBalance || 0);
                return sum + creditBalance + cashBalance;
            }, 0);

            const totalCashExpenses = allExpenses.reduce((sum, expense) => {
                if (expense.paymentMethod === 'cash') {
                    return sum + parseFloat(expense.amount || 0);
                }
                return sum;
            }, 0);

            const cash = totalVoucherAmount - totalLedgerBalance - totalCashExpenses;
            setCashInHand(cash);
        } catch (error) {
            console.error('Failed to calculate cash in hand:', error);
            setCashInHand(0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount);

        if (amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        if (formData.paymentMethod === 'cash' && amount > cashInHand) {
            setPendingExpenseData(formData);
            setCashWarningOpen(true);
            return;
        }

        await submitExpense(formData);
    };

    const submitExpense = async (expenseData) => {
        try {
            await expenseAPI.create(expenseData);
            toast.success('Expense added successfully!');
            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: 'petrol',
                amount: '',
                description: '',
                paymentMethod: 'cash'
            });
            fetchExpenses();
            calculateCashInHand();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add expense');
        }
    };

    const handleStartEdit = (expense) => {
        setEditingId(expense._id);
        setEditData({
            date: new Date(expense.date).toISOString().split('T')[0],
            category: expense.category,
            amount: expense.amount,
            description: expense.description || '',
            paymentMethod: expense.paymentMethod
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData(null);
    };

    const handleSaveEdit = async (expenseId) => {
        if (!editData.amount || parseFloat(editData.amount) <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        try {
            await expenseAPI.update(expenseId, {
                date: editData.date,
                category: editData.category,
                amount: parseFloat(editData.amount),
                description: editData.description,
                paymentMethod: editData.paymentMethod
            });
            toast.success('Expense updated successfully!');
            setEditingId(null);
            setEditData(null);
            fetchExpenses();
            calculateCashInHand();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update expense');
        }
    };

    const handleDeleteExpense = (expenseId) => {
        setDeleteConfirmId(expenseId);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteExpense = async () => {
        try {
            await expenseAPI.delete(deleteConfirmId);
            toast.success('Expense deleted successfully');
            setDeleteConfirmId(null);
            fetchExpenses();
            calculateCashInHand();
        } catch (error) {
            toast.error('Failed to delete expense');
        }
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            category: '',
            paymentMethod: ''
        });
    };

    const getTotalExpenses = () => {
        return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    };

    const handleRefresh = async () => {
        await Promise.all([fetchExpenses(), calculateCashInHand()]);
    };

    return (
        <Layout>
            <PullToRefresh onRefresh={handleRefresh}>
                <div className="fade-in">
                    <h1 style={{ marginBottom: '2rem' }}>Business Expenses</h1>

                    {/* Total Expenses Display */}
                    {loading ? (
                        <SkeletonStat count={1} />
                    ) : (
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
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Expenses (filtered)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#667eea', marginTop: '4px' }}>
                                    ₹{getTotalExpenses().toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Expense Form */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Add New Expense</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-2">
                                <div className="input-group">
                                    <label className="input-label">Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Category</label>
                                    <select
                                        className="input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Amount (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        min="0.01"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Payment Method</label>
                                    <select
                                        className="input"
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        required
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Description (Optional)</label>
                                <textarea
                                    className="input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    placeholder="Add notes about this expense..."
                                ></textarea>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                <FiSave /> Add Expense
                            </button>
                        </form>
                    </div>

                    {/* Filters */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
                        <div className="grid grid-4">
                            <div className="input-group">
                                <label className="input-label">Start Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">End Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Category</label>
                                <select
                                    className="input"
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                >
                                    <option value="">All Categories</option>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Payment Method</label>
                                <select
                                    className="input"
                                    value={filters.paymentMethod}
                                    onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                                >
                                    <option value="">All Methods</option>
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleClearFilters} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                            Clear Filters
                        </button>
                    </div>

                    {/* Expenses List */}
                    {expenses.length > 0 && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2>Expense History</h2>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                                    Total: ₹{getTotalExpenses().toFixed(2)}
                                </div>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Description</th>
                                            <th>Payment</th>
                                            <th>Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map((expense) => (
                                            editingId === expense._id ? (
                                                // Inline Edit Row
                                                <tr key={expense._id} style={{ background: 'var(--bg-secondary)' }}>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            className="input"
                                                            value={editData.date}
                                                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                                            style={{ minWidth: '130px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="input"
                                                            value={editData.category}
                                                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                        >
                                                            {EXPENSE_CATEGORIES.map(cat => (
                                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            value={editData.description}
                                                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                            placeholder="Description"
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="input"
                                                            value={editData.paymentMethod}
                                                            onChange={(e) => setEditData({ ...editData, paymentMethod: e.target.value })}
                                                        >
                                                            <option value="cash">Cash</option>
                                                            <option value="online">Online</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input"
                                                            value={editData.amount}
                                                            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                                                            style={{ minWidth: '100px' }}
                                                            min="0.01"
                                                        />
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleSaveEdit(expense._id)}
                                                                className="btn btn-sm btn-primary"
                                                                title="Save"
                                                            >
                                                                <FiCheck />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="btn btn-sm btn-secondary"
                                                                title="Cancel"
                                                            >
                                                                <FiX />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                // Normal Row
                                                <tr key={expense._id}>
                                                    <td>{format(new Date(expense.date), 'dd MMM yyyy')}</td>
                                                    <td className="text-capitalize">
                                                        <span className="badge badge-info">
                                                            {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                                                        </span>
                                                    </td>
                                                    <td>{expense.description || '-'}</td>
                                                    <td>
                                                        <span className={`badge ${expense.paymentMethod === 'cash' ? 'badge-warning' : 'badge-success'}`}>
                                                            {expense.paymentMethod === 'cash' ? 'Cash' : 'Online'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>₹{parseFloat(expense.amount).toFixed(2)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleStartEdit(expense)}
                                                                className="btn btn-sm btn-secondary"
                                                                title="Edit"
                                                            >
                                                                <FiEdit2 />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteExpense(expense._id)}
                                                                className="btn btn-sm btn-danger"
                                                                title="Delete"
                                                            >
                                                                <FiTrash2 />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {expenses.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3>No Expenses Found</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Add your first expense using the form above</p>
                        </div>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <ConfirmDialog
                        isOpen={deleteConfirmOpen}
                        onClose={() => {
                            setDeleteConfirmOpen(false);
                            setDeleteConfirmId(null);
                        }}
                        onConfirm={confirmDeleteExpense}
                        title="Delete Expense"
                        message="Are you sure you want to delete this expense? This action cannot be undone."
                        confirmText="Delete"
                        cancelText="Cancel"
                        danger={true}
                    />

                    {/* Cash Warning Dialog */}
                    <ConfirmDialog
                        isOpen={cashWarningOpen}
                        onClose={() => {
                            setCashWarningOpen(false);
                            setPendingExpenseData(null);
                        }}
                        onConfirm={() => {
                            if (pendingExpenseData) {
                                submitExpense(pendingExpenseData);
                            }
                            setCashWarningOpen(false);
                            setPendingExpenseData(null);
                        }}
                        title="Cash Balance Warning"
                        message={`This expense (₹${pendingExpenseData?.amount || 0}) exceeds your cash in hand (₹${cashInHand.toFixed(2)}). Your cash balance will become negative. Do you want to proceed?`}
                        confirmText="Proceed"
                        cancelText="Cancel"
                        danger={true}
                    />
                </div>
            </PullToRefresh>
        </Layout>
    );
}
