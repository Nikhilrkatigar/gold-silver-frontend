import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { karigarAPI, stockAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiTrash2, FiEye, FiPrinter, FiX, FiArrowLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard, SkeletonStat, SkeletonTable } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';

export default function Karigar() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [currentStock, setCurrentStock] = useState({ gold: 0, silver: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uniqueNames, setUniqueNames] = useState([]);
  const [selectedKarigarName, setSelectedKarigarName] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [karigarSearch, setKarigarSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    danger: false
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'given',
    karigarName: '',
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

  // Extract unique karigar names (case-insensitive, use karigarName field with fallback to itemName for old records)
  useEffect(() => {
    const namesSet = new Set(
      transactions
        .map(t => (t.karigarName || t.itemName || '').trim().toLowerCase())
        .filter(Boolean)
    );
    setUniqueNames(Array.from(namesSet).sort());
  }, [transactions]);

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

  // Handle search input for Karigar name
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (formData.type === 'received') {
      setShowDropdown(true);
    }
  };

  // Filter names based on search input
  const getFilteredNames = () => {
    const searchLower = searchInput.toLowerCase().trim();
    if (!searchLower) return uniqueNames;
    return uniqueNames.filter(name => name.includes(searchLower));
  };

  // Select a name from dropdown or create new one
  const handleSelectName = (name) => {
    setFormData(prev => ({
      ...prev,
      karigarName: name
    }));
    setSearchInput('');
    setShowDropdown(false);
  };

  // Create new Karigar if not in list
  const handleCreateNewKarigar = () => {
    const trimmedName = searchInput.trim();
    if (!trimmedName) {
      toast.error('Please enter a Karigar name');
      return;
    }

    setFormData(prev => ({
      ...prev,
      karigarName: trimmedName
    }));
    setSearchInput('');
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.karigarName || !formData.itemName || !formData.fineWeight) {
      toast.error('Please fill in Karigar name, item name, and fine weight');
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
        karigarName: formData.karigarName.trim(),
        itemName: formData.itemName.trim(),
        metalType: formData.metalType,
        fineWeight: fineWeight,
        chargeAmount: formData.chargeAmount ? parseFloat(formData.chargeAmount) : 0,
        narration: formData.narration
      });

      toast.success('Transaction created successfully!');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'given',
        karigarName: '',
        itemName: '',
        metalType: 'gold',
        fineWeight: '',
        chargeAmount: '',
        narration: ''
      });
      setSearchInput('');
      fetchTransactions();
      fetchStock();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Delete this transaction? Stock will be reversed.',
      danger: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await karigarAPI.delete(transactionId);
          toast.success('Transaction deleted successfully');
          fetchTransactions();
          fetchStock();
        } catch (error) {
          toast.error('Failed to delete transaction');
        }
      }
    });
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
              <div class="label">Karigar Name</div>
              <div class="value" style="text-transform: capitalize;">${transaction.itemName}</div>
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

  // Get transactions for selected Karigar (by karigarName or itemName for old records)
  const getKarigarTransactions = (name) => {
    return transactions.filter(t => {
      const kName = (t.karigarName || t.itemName || '').toLowerCase().trim();
      return kName === name.toLowerCase().trim();
    });
  };

  // Calculate totals for a Karigar
  const getKarigarStats = (name) => {
    const karigarTxns = getKarigarTransactions(name);
    const givenGold = karigarTxns
      .filter(t => t.type === 'given' && t.metalType === 'gold')
      .reduce((sum, t) => sum + parseFloat(t.fineWeight), 0);
    const givenSilver = karigarTxns
      .filter(t => t.type === 'given' && t.metalType === 'silver')
      .reduce((sum, t) => sum + parseFloat(t.fineWeight), 0);
    const receivedGold = karigarTxns
      .filter(t => t.type === 'received' && t.metalType === 'gold')
      .reduce((sum, t) => sum + parseFloat(t.fineWeight), 0);
    const receivedSilver = karigarTxns
      .filter(t => t.type === 'received' && t.metalType === 'silver')
      .reduce((sum, t) => sum + parseFloat(t.fineWeight), 0);
    const totalCharge = karigarTxns
      .reduce((sum, t) => sum + (parseFloat(t.chargeAmount) || 0), 0);

    return {
      givenGold,
      givenSilver,
      receivedGold,
      receivedSilver,
      balanceGold: receivedGold - givenGold,
      balanceSilver: receivedSilver - givenSilver,
      totalCharge
    };
  };

  const filteredNames = getFilteredNames();

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Form Section */}
        <div className="card" style={{ padding: '32px', marginBottom: '32px', boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Karigar Management</h1>

          {/* Current Stock Display */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
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
            <div style={{
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Charges</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                ₹{transactions.reduce((sum, t) => sum + (parseFloat(t.chargeAmount) || 0), 0).toFixed(2)}
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
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Karigar Name *</label>
                <input
                  type="text"
                  value={formData.karigarName || searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setFormData(prev => ({ ...prev, karigarName: e.target.value }));
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Enter karigar (worker) name"
                  className="input"
                  style={{ width: '100%' }}
                  autoComplete="off"
                  required
                />

                {/* Dropdown */}
                {showDropdown && (formData.type === 'received' || searchInput) && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    {/* Existing names */}
                    {filteredNames.length > 0 && (
                      <>
                        {filteredNames.map((name) => (
                          <div
                            key={name}
                            onClick={() => handleSelectName(name)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background-color 0.2s',
                              textTransform: 'capitalize',
                              color: 'var(--text-primary)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {name}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Create new option */}
                    {searchInput && !uniqueNames.includes(searchInput.toLowerCase().trim()) && (
                      <div
                        onClick={handleCreateNewKarigar}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                      >
                        + Create "{searchInput.toLowerCase().trim()}"
                      </div>
                    )}

                    {/* Empty state */}
                    {filteredNames.length === 0 && !searchInput && formData.type === 'received' && (
                      <div style={{
                        padding: '16px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        fontSize: '0.875rem'
                      }}>
                        No Karigars available
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '6px' }}>Item / Work Description *</label>
                <input
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder="e.g. Necklace, Bangles, Chain"
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

        {/* Karigar List View */}
        {!selectedKarigarName ? (
          <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Karigar List</h2>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                value={karigarSearch}
                onChange={(e) => setKarigarSearch(e.target.value)}
                placeholder="Search Karigar by name..."
                className="input"
                style={{ width: '100%', maxWidth: '400px' }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              </div>
            ) : uniqueNames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No Karigars added yet
              </div>
            ) : (
              <>
                {(() => {
                  const filteredKarigars = uniqueNames.filter(name =>
                    name.toLowerCase().includes(karigarSearch.toLowerCase())
                  );

                  return (
                    <>
                      {karigarSearch && (
                        <div style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Found {filteredKarigars.length} result{filteredKarigars.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {filteredKarigars.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                          No Karigars match your search
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                          {filteredKarigars.map((name) => {
                            const stats = getKarigarStats(name);
                            const txns = getKarigarTransactions(name);
                            return (
                              <div
                                key={name}
                                onClick={() => setSelectedKarigarName(name)}
                                style={{
                                  padding: '20px',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s',
                                  background: 'var(--bg-primary)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--border-color)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div>
                                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.125rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                    {name}
                                  </h3>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Total Transactions: <strong>{txns.length}</strong>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                                    <div>Gold Given: <strong style={{ color: '#f59e0b' }}>{stats.givenGold.toFixed(3)}g</strong></div>
                                    <div>Gold Received: <strong style={{ color: '#f59e0b' }}>{stats.receivedGold.toFixed(3)}g</strong></div>
                                    <div>Silver Given: <strong style={{ color: '#c0c0c0' }}>{stats.givenSilver.toFixed(3)}g</strong></div>
                                    <div>Silver Received: <strong style={{ color: '#c0c0c0' }}>{stats.receivedSilver.toFixed(3)}g</strong></div>
                                  </div>
                                </div>
                                <FiChevronRight size={24} style={{ color: 'var(--color-primary)', marginLeft: '16px', flexShrink: 0 }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          /* Karigar Detail View */
          <div className="card" style={{ padding: '32px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setSelectedKarigarName(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-primary)',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiArrowLeft size={20} />
              </button>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                {selectedKarigarName}
              </h2>
            </div>

            {/* Karigar Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              {(() => {
                const stats = getKarigarStats(selectedKarigarName);
                return (
                  <>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Gold Given</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{stats.givenGold.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Gold Received</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{stats.receivedGold.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Gold Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{stats.balanceGold.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Silver Given</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c0c0c0' }}>{stats.givenSilver.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Silver Received</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c0c0c0' }}>{stats.receivedSilver.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Silver Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c0c0c0' }}>{stats.balanceSilver.toFixed(3)}g</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Total Charge</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>₹{stats.totalCharge.toFixed(2)}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Transactions Table */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Transaction History</h3>
            {getKarigarTransactions(selectedKarigarName).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No transactions for this Karigar
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Date</th>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Type</th>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Metal</th>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Fine (g)</th>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'left' }}>Charge</th>
                      <th style={{ borderBottom: '2px solid var(--border-color)', padding: '12px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getKarigarTransactions(selectedKarigarName).map((transaction) => (
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
        )}
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
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Karigar Name</div>
              <div style={{ marginTop: '4px', fontSize: '1rem', textTransform: 'capitalize' }}>
                {selectedTransaction.karigarName || selectedTransaction.itemName}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Item / Work</div>
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        confirmText={confirmDialog.confirmText || 'Confirm'}
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </Layout>
  );
}