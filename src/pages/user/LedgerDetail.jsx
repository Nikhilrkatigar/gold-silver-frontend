import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI, settlementAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiTrash2, FiArrowLeft, FiEye, FiX, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function LedgerDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState(null); // 'voucher' or 'settlement'
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchLedgerDetails();
  }, [id, filters]);

  const fetchLedgerDetails = async () => {
    try {
      const response = await ledgerAPI.getTransactions(id, filters);
      setLedger(response.data.ledger);
      setTransactions(response.data.transactions);
    } catch (error) {
      toast.error('Failed to load ledger details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    if (!confirm('Delete this voucher?')) return;

    try {
      await voucherAPI.delete(voucherId);
      toast.success('Voucher deleted successfully');
      fetchLedgerDetails();
    } catch (error) {
      toast.error('Failed to delete voucher');
    }
  };

  const handlePreviewVoucher = (voucher) => {
    setPreviewType('voucher');
    setSelectedItem(voucher);
    setShowPreview(true);
  };

  const handlePrintVoucher = (voucher) => {
    const printWindow = window.open('', '_blank');
    const voucherHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .total-row { font-weight: bold; background-color: #f5f5f5; }
          .amount-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .section-label { font-weight: bold; margin-bottom: 5px; margin-top: 10px; }
          .line-height { height: 30px; border-bottom: 1px solid #000; }
          .voucher-container { max-width: 900px; margin: 0 auto; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div class="shop-name">${user?.shopName || 'ESTIMATE/ON APPROVAL'}</div>
            <div style="font-size: 14px; margin-top: 5px;">ESTIMATE/ON APPROVAL - Issue</div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <div>Name : <strong>${ledger?.name || 'N/A'}</strong></div>
              <div>Voucher No : <strong>${voucher.voucherNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <div>Date : ${new Date(voucher.date).toLocaleDateString('en-IN')}</div>
              <div>Page No : 1/1</div>
            </div>
          </div>

          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 5%;">Sr</th>
                <th style="width: 15%;">Item Name</th>
                <th style="width: 5%;">Pcs</th>
                <th style="width: 10%;">Gross</th>
                <th style="width: 10%;">Less</th>
                <th style="width: 10%;">Net Wt</th>
                <th style="width: 10%;">Melting</th>
                <th style="width: 10%;">Wastage</th>
                <th style="width: 10%;">Fine Wt</th>
                <th style="width: 10%;">Lab Rt</th>
                <th style="width: 10%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.items && voucher.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td>${item.pieces}</td>
                  <td>${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.melting).toFixed(3)}</td>
                  <td>${parseFloat(item.wastage).toFixed(3)}</td>
                  <td>${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td>${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
              <tr style="font-weight: bold; background-color: #f5f5f5;">
                <td colspan="2">Total</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0) : 0}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td></td>
                <td></td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Stone Amount :</div>
              <div>${parseFloat(voucher.stoneAmount || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Fine Amount :</div>
              <div>${parseFloat(voucher.fineAmount || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Labour :</div>
              <div>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Net Balance :</div>
              <div style="height: 30px; border-bottom: 1px solid #000;"></div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Narration :</div>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
            </div>

            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Gold Rate :</div>
              <div>${parseFloat(voucher.goldRate || 0).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Silver Rate :</div>
              <div>${parseFloat(voucher.silverRate || 0).toFixed(2)}</div>
              
              <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Issue</div>
                  <div>${parseFloat(voucher.issue?.gross || 0).toFixed(3)}</div>
                </div>
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Recept</div>
                  <div>${parseFloat(voucher.receipt?.gross || 0).toFixed(3)}</div>
                </div>
              </div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 15px;">Old Bal Amt :</div>
              <div>${ledger?.balances?.amount?.toFixed(2) || '0.00'}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Old Bal Fine Wt :</div>
              <div>${(((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0))).toFixed(3)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 15px;">Cur Bal Amt :</div>
              <div>${((parseFloat(ledger?.balances?.amount || 0)) - (voucher.total || 0)).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Cur Bal Net Wt :</div>
              <div>${((((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0))) - (voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0) : 0)).toFixed(3)}</div>
            </div>
          </div>
        </div>
        <script>
          window.print();
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(voucherHTML);
    printWindow.document.close();
  };

  const handlePreviewSettlement = (settlement) => {
    setPreviewType('settlement');
    setSelectedItem(settlement);
    setShowPreview(true);
  };

  const handlePrintSettlement = (settlement) => {
    const printWindow = window.open('', '_blank');
    const settlementHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Settlement Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
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
              <div class="value" style="text-transform: capitalize;">${settlement.metalType}</div>
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

  const handleDeleteSettlement = async (settlementId) => {
    if (!confirm('Delete this settlement?')) return;

    try {
      await settlementAPI.delete(settlementId);
      toast.success('Settlement deleted successfully');
      fetchLedgerDetails();
    } catch (error) {
      toast.error('Failed to delete settlement');
    }
  };

  const handleDeleteAllVouchers = async () => {
    if (!confirm('Delete ALL vouchers for this ledger? This cannot be undone!')) return;

    try {
      await ledgerAPI.deleteAllVouchers(id);
      toast.success('All vouchers deleted successfully');
      fetchLedgerDetails();
    } catch (error) {
      toast.error('Failed to delete vouchers');
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

  const totalCredit = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => sum + (t.total || 0), 0);

  return (
    <Layout>
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/ledgers')} className="btn btn-secondary mb-2">
            <FiArrowLeft /> Back to Ledgers
          </button>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>{ledger?.name}</h2>
          <p className="text-muted">{ledger?.phoneNumber}</p>
          
          <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>Gold Fine Weight</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{ledger?.balances?.goldFineWeight?.toFixed(3) || '0.000'} g</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>Silver Fine Weight</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{ledger?.balances?.silverFineWeight?.toFixed(3) || '0.000'} g</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Transactions</h3>
            <button onClick={handleDeleteAllVouchers} className="btn btn-sm btn-danger">
              <FiTrash2 /> Delete All Vouchers
            </button>
          </div>

          <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label className="input-label">End Date</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Voucher/Settlement #</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>{format(new Date(txn.date), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${txn.type === 'voucher' ? 'badge-info' : 'badge-success'}`}>
                        {txn.type === 'voucher' ? 'Voucher' : 'Settlement'}
                      </span>
                    </td>
                    <td>{txn.type === 'voucher' ? txn.voucherNumber : `SET-${txn._id.substring(0, 6).toUpperCase()}`}</td>
                    <td>₹{txn.total?.toFixed(2) || txn.amount?.toFixed(2) || '0.00'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => txn.type === 'voucher' ? handlePreviewVoucher(txn) : handlePreviewSettlement(txn)} 
                          className="btn btn-sm btn-secondary"
                          title="Preview"
                        >
                          <FiEye />
                        </button>
                        <button 
                          onClick={() => txn.type === 'voucher' ? handlePrintVoucher(txn) : handlePrintSettlement(txn)}
                          className="btn btn-sm btn-secondary"
                          title="Print"
                        >
                          <FiPrinter />
                        </button>
                        <button 
                          onClick={() => txn.type === 'voucher' ? handleDeleteVoucher(txn._id) : handleDeleteSettlement(txn._id)}
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--bg-tertiary)' }}>
                  <td colSpan="3">Total Credit</td>
                  <td>₹{totalCredit.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {showPreview && selectedItem && (
          <div className="modal-overlay" onClick={() => setShowPreview(false)}>
            <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  {previewType === 'voucher' 
                    ? `Voucher Preview - #${selectedItem.voucherNumber}` 
                    : `Settlement Preview`}
                </h3>
                <button onClick={() => setShowPreview(false)} className="btn btn-sm" style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                {previewType === 'voucher' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Date</div>
                        <div>{format(new Date(selectedItem.date), 'dd MMM yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Payment Type</div>
                        <div className="text-capitalize">{selectedItem.paymentType}</div>
                      </div>
                      {selectedItem.goldRate && (
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Gold Rate</div>
                          <div>₹{parseFloat(selectedItem.goldRate).toFixed(2)}</div>
                        </div>
                      )}
                      {selectedItem.silverRate && (
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Silver Rate</div>
                          <div>₹{parseFloat(selectedItem.silverRate).toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {selectedItem.items && selectedItem.items.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Items</h4>
                        <div className="table-container">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Pcs</th>
                                <th>Net Wt</th>
                                <th>Fine Wt</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedItem.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.itemName}</td>
                                  <td>{item.pieces}</td>
                                  <td>{parseFloat(item.netWeight).toFixed(3)}</td>
                                  <td>{parseFloat(item.fineWeight).toFixed(3)}</td>
                                  <td>₹{parseFloat(item.amount).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        {selectedItem.stoneAmount && (
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Stone Amount</div>
                            <div>₹{parseFloat(selectedItem.stoneAmount).toFixed(2)}</div>
                          </div>
                        )}
                        {selectedItem.fineAmount && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Fine Amount</div>
                            <div>₹{parseFloat(selectedItem.fineAmount).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Amount</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          ₹{selectedItem.total?.toFixed(2) || (
                            (selectedItem.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0) +
                            (parseFloat(selectedItem.stoneAmount) || 0) +
                            (parseFloat(selectedItem.fineAmount) || 0)
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {selectedItem.narration && (
                      <div style={{ marginTop: '1rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Narration</div>
                        <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          {selectedItem.narration}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Customer</div>
                        <div>{ledger?.name}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Date</div>
                        <div>{format(new Date(selectedItem.date), 'dd MMM yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Metal Type</div>
                        <div className="text-capitalize">{selectedItem.metalType}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Rate</div>
                        <div>₹{parseFloat(selectedItem.metalRate).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Fine Given</div>
                        <div>{parseFloat(selectedItem.fineGiven).toFixed(3)} g</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Amount</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>₹{parseFloat(selectedItem.amount).toFixed(2)}</div>
                      </div>
                    </div>
                    {selectedItem.narration && (
                      <div style={{ marginTop: '1rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Narration</div>
                        <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          {selectedItem.narration}
                        </div>
                      </div>
                    )}
                  </>
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
