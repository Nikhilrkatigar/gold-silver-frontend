import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { ledgerAPI, settlementAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiSave, FiTrash2, FiEye, FiPrinter, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function Settlement() {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [formData, setFormData] = useState({
    ledgerId: '',
    metalType: 'gold',
    metalRate: '',
    fineGiven: '',
    narration: ''
  });
  const [calculatedAmount, setCalculatedAmount] = useState(0);

  useEffect(() => {
    fetchLedgers();
    fetchSettlements();
  }, []);

  useEffect(() => {
    if (formData.ledgerId) {
      const ledger = ledgers.find(l => l._id === formData.ledgerId);
      setSelectedLedger(ledger);
    }
  }, [formData.ledgerId, ledgers]);

  useEffect(() => {
    const rate = parseFloat(formData.metalRate) || 0;
    const fine = parseFloat(formData.fineGiven) || 0;
    setCalculatedAmount(rate * fine);
  }, [formData.metalRate, formData.fineGiven]);

  const fetchLedgers = async () => {
    try {
      const response = await ledgerAPI.getAll();
      setLedgers(response.data.ledgers.filter(l => 
        l.balances.goldFineWeight > 0 || l.balances.silverFineWeight > 0
      ));
    } catch (error) {
      toast.error('Failed to load ledgers');
    }
  };

  const fetchSettlements = async () => {
    try {
      const response = await settlementAPI.getAll();
      setSettlements(response.data.settlements);
    } catch (error) {
      toast.error('Failed to load settlements');
    }
  };

  const getBalance = () => {
    if (!selectedLedger) return 0;
    return formData.metalType === 'gold' 
      ? selectedLedger.balances.goldFineWeight
      : selectedLedger.balances.silverFineWeight;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const balance = getBalance();
    const fineGiven = parseFloat(formData.fineGiven);

    if (fineGiven > balance) {
      toast.error('Insufficient balance for this settlement');
      return;
    }

    try {
      await settlementAPI.create(formData);
      toast.success('Settlement created successfully!');
      setFormData({
        ledgerId: '',
        metalType: 'gold',
        metalRate: '',
        fineGiven: '',
        narration: ''
      });
      setSelectedLedger(null);
      fetchLedgers();
      fetchSettlements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create settlement');
    }
  };

  const handleDeleteSettlement = async (settlementId) => {
    if (!confirm('Delete this settlement?')) return;

    try {
      await settlementAPI.delete(settlementId);
      toast.success('Settlement deleted successfully');
      fetchSettlements();
      fetchLedgers();
    } catch (error) {
      toast.error('Failed to delete settlement');
    }
  };

  const handlePreviewSettlement = (settlement) => {
    setSelectedSettlement(settlement);
    setShowPreview(true);
  };

  const handlePrintSettlement = (settlement) => {
    const ledger = ledgers.find(l => l._id === settlement.ledgerId);
    const printWindow = window.open('', '_blank');
    const settlementHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Settlement Print</title>
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
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">${user?.shopName || 'SETTLEMENT'}</div>

        <div class="details">
          <div>
            <div class="detail-item">
              <div class="label">Customer Name</div>
              <div class="value">${ledger?.name || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Metal Type</div>
              <div class="value text-capitalize">${settlement.metalType}</div>
            </div>
            <div class="detail-item">
              <div class="label">Fine Given</div>
              <div class="value">${parseFloat(settlement.fineGiven).toFixed(3)} g</div>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <div class="label">Date</div>
              <div class="value">${new Date(settlement.date).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="detail-item">
              <div class="label">Metal Rate</div>
              <div class="value">₹${parseFloat(settlement.metalRate).toFixed(2)}</div>
            </div>
            <div class="detail-item">
              <div class="label">Settlement Amount</div>
              <div class="value" style="font-weight: bold; font-size: 1.3rem;">₹${parseFloat(settlement.amount).toFixed(2)}</div>
            </div>
          </div>
        </div>

        ${settlement.narration ? `
          <div style="margin-top: 20px;">
            <div class="label">Narration</div>
            <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; margin-top: 5px;">
              ${settlement.narration}
            </div>
          </div>
        ` : ''}

        <script>
          window.print();
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(settlementHTML);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div>
        <h1 style={{ marginBottom: '2rem' }}>Settlement</h1>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Customer Name</label>
              <select
                className="input"
                value={formData.ledgerId}
                onChange={(e) => setFormData({...formData, ledgerId: e.target.value})}
                required
              >
                <option value="">Select Customer</option>
                {ledgers.map(ledger => (
                  <option key={ledger._id} value={ledger._id}>{ledger.name}</option>
                ))}
              </select>
            </div>

            {selectedLedger && (
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div className="grid grid-2">
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Gold Balance</div>
                    <div style={{ fontWeight: 600 }}>{selectedLedger.balances.goldFineWeight.toFixed(3)} g</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Silver Balance</div>
                    <div style={{ fontWeight: 600 }}>{selectedLedger.balances.silverFineWeight.toFixed(3)} g</div>
                  </div>
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Metal Type</label>
              <select
                className="input"
                value={formData.metalType}
                onChange={(e) => setFormData({...formData, metalType: e.target.value})}
                disabled={!formData.ledgerId}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>

            {formData.ledgerId && (
              <>
                <div className="input-group">
                  <label className="input-label">Auto-Fetched Balance</label>
                  <input
                    type="text"
                    className="input"
                    value={`${getBalance().toFixed(3)} g`}
                    disabled
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">{formData.metalType === 'gold' ? 'Gold' : 'Silver'} Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={formData.metalRate}
                    onChange={(e) => setFormData({...formData, metalRate: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Fine Given (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="input"
                    value={formData.fineGiven}
                    onChange={(e) => setFormData({...formData, fineGiven: e.target.value})}
                    max={getBalance()}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Calculated Amount</label>
                  <input
                    type="text"
                    className="input"
                    value={`₹${calculatedAmount.toFixed(2)}`}
                    disabled
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Narration</label>
                  <textarea
                    className="input"
                    value={formData.narration}
                    onChange={(e) => setFormData({...formData, narration: e.target.value})}
                    rows="3"
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  <FiSave /> Create Settlement
                </button>
              </>
            )}
          </form>
        </div>

        {settlements.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Recent Settlements</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Metal Type</th>
                    <th>Fine Given</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement._id}>
                      <td>{format(new Date(settlement.date), 'dd MMM yyyy')}</td>
                      <td>{ledgers.find(l => l._id === settlement.ledgerId)?.name || 'N/A'}</td>
                      <td className="text-capitalize">{settlement.metalType}</td>
                      <td>{parseFloat(settlement.fineGiven).toFixed(3)} g</td>
                      <td>₹{parseFloat(settlement.amount).toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handlePreviewSettlement(settlement)} className="btn btn-sm btn-secondary">
                            <FiEye /> Preview
                          </button>
                          <button onClick={() => handlePrintSettlement(settlement)} className="btn btn-sm btn-secondary">
                            <FiPrinter /> Print
                          </button>
                          <button onClick={() => handleDeleteSettlement(settlement._id)} className="btn btn-sm btn-danger">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showPreview && selectedSettlement && (
          <div className="modal-overlay" onClick={() => setShowPreview(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Settlement Preview</h3>
                <button onClick={() => setShowPreview(false)} className="btn btn-sm" style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Customer Name</div>
                    <div>{ledgers.find(l => l._id === selectedSettlement.ledgerId)?.name || 'N/A'}</div>

                    <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Metal Type</div>
                    <div className="text-capitalize">{selectedSettlement.metalType}</div>

                    <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Fine Given</div>
                    <div>{parseFloat(selectedSettlement.fineGiven).toFixed(3)} g</div>
                  </div>

                  <div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Date</div>
                    <div>{format(new Date(selectedSettlement.date), 'dd MMM yyyy')}</div>

                    <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Metal Rate</div>
                    <div>₹{parseFloat(selectedSettlement.metalRate).toFixed(2)}</div>

                    <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>Settlement Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>₹{parseFloat(selectedSettlement.amount).toFixed(2)}</div>
                  </div>
                </div>

                {selectedSettlement.narration && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>Narration</div>
                    <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', marginTop: '0.5rem' }}>
                      {selectedSettlement.narration}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowPreview(false)} className="btn btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
