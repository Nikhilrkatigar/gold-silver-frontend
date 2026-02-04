import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter, FiShare2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

// Voucher Print Template Component
const VoucherTemplate = ({ formData, items, ledgers, user }) => {
  const ledger = ledgers.find(l => l._id === formData.ledgerId);
  const totals = {
    pieces: items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0),
    grossWeight: items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0),
    lessWeight: items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0),
    netWeight: items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0),
    fineWeight: items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0),
    labourRate: items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0),
    amount: items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  };

  const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .voucher-container { page-break-inside: avoid; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .subheader { text-align: center; font-size: 14px; margin-bottom: 20px; }
        .details-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .details-col { flex: 1; }
        .total-row { font-weight: bold; background-color: #f5f5f5; }
        .footer-section { margin-top: 20px; }
        .amount-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .section-label { font-weight: bold; margin-bottom: 5px; }
        .line-height { height: 30px; border-bottom: 1px solid #000; }
      `}</style>

      <div className="voucher-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{user?.shopName || 'ESTIMATE/ON APPROVAL'}</div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>ESTIMATE/ON APPROVAL - Issue</div>
        </div>

        {/* Top Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div>Name : <strong>{ledger?.name || 'N/A'}</strong></div>
            <div>Voucher No : <strong>{formData.voucherNumber}</strong></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Date : {new Date(formData.date).toLocaleDateString('en-IN')}</div>
            <div>Page No : 1/1</div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>Sr</th>
              <th style={{ width: '15%' }}>Item Name</th>
              <th style={{ width: '5%' }}>Pcs</th>
              <th style={{ width: '10%' }}>Gross</th>
              <th style={{ width: '10%' }}>Less</th>
              <th style={{ width: '10%' }}>Net Wt</th>
              <th style={{ width: '10%' }}>Wastage</th>
              <th style={{ width: '10%' }}>Fine Wt</th>
              <th style={{ width: '10%' }}>Lab Rt</th>
              <th style={{ width: '10%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.itemName}</td>
                <td>{item.pieces}</td>
                <td>{parseFloat(item.grossWeight).toFixed(3)}</td>
                <td>{parseFloat(item.lessWeight).toFixed(3)}</td>
                <td>{parseFloat(item.netWeight).toFixed(3)}</td>
                <td>{parseFloat(item.wastage).toFixed(3)}</td>
                <td>{parseFloat(item.fineWeight).toFixed(3)}</td>
                <td>{parseFloat(item.labourRate).toFixed(2)}</td>
                <td>{parseFloat(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="2">Total</td>
              <td>{totals.pieces}</td>
              <td>{totals.grossWeight.toFixed(3)}</td>
              <td>{totals.lessWeight.toFixed(3)}</td>
              <td>{totals.netWeight.toFixed(3)}</td>
              <td>{totals.wastage.toFixed(3)}</td>
              <td>{totals.fineWeight.toFixed(3)}</td>
              <td>{totals.labourRate.toFixed(2)}</td>
              <td>{totals.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount Section */}
        <div className="amount-section">
          <div>
            <div className="section-label">Stone Amount :</div>
            <div>{parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
            
            <div className="section-label" style={{ marginTop: '10px' }}>Labour :</div>
            <div>{totals.labourRate.toFixed(2)}</div>

            <div className="section-label" style={{ marginTop: '20px' }}>Net Balance :</div>
            <div className="line-height"></div>

            <div className="section-label" style={{ marginTop: '20px' }}>Narration :</div>
            <div className="line-height" style={{ height: '60px' }}></div>
          </div>

          <div>
            <div className="section-label">Gold Rate :</div>
            <div>{parseFloat(formData.goldRate || 0).toFixed(2)}</div>

            <div className="section-label" style={{ marginTop: '10px' }}>Silver Rate :</div>
            <div>{parseFloat(formData.silverRate || 0).toFixed(2)}</div>
            
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div className="section-label">Issue</div>
                <div>{parseFloat(formData.issueGross || 0).toFixed(3)}</div>
              </div>
              <div>
                <div className="section-label">Recept</div>
                <div>{parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
              </div>
            </div>

            <div className="section-label" style={{ marginTop: '15px' }}>Old Bal Amt :</div>
            <div>{ledger?.balances?.amount?.toFixed(2) || '0.00'}</div>

            <div className="section-label" style={{ marginTop: '10px' }}>Old Bal Fine Wt :</div>
            <div>{((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0)).toFixed(3)}</div>

            <div className="section-label" style={{ marginTop: '15px' }}>Cur Bal Amt :</div>
            <div>{(parseFloat(ledger?.balances?.amount || 0) - grandTotal).toFixed(2)}</div>

            <div className="section-label" style={{ marginTop: '10px' }}>Cur Bal Net Wt :</div>
            <div>{(((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0)) - totals.netWeight).toFixed(3)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Billing() {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [formData, setFormData] = useState({
    ledgerId: '',
    date: new Date().toISOString().split('T')[0],
    voucherNumber: user?.voucherSettings?.autoIncrement ? user.voucherSettings.currentVoucherNumber : '',
    paymentType: 'cash',
    goldRate: '',
    silverRate: '',
    stoneAmount: '',
    issueGross: '',
    receiptGross: '',
    narration: ''
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchLedgers();
    // Initialize with empty items array instead of one item
  }, []);

  // Auto-calculate Issue (Gross) when items change
  useEffect(() => {
    const newTotals = calculateTotals();
    setFormData(prev => ({
      ...prev,
      issueGross: newTotals.grossWeight.toString()
    }));
  }, [items]);

  const fetchLedgers = async () => {
    try {
      const response = await ledgerAPI.getAll();
      setLedgers(response.data.ledgers);
    } catch (error) {
      toast.error('Failed to load ledgers');
    }
  };

  const calculateItem = (index) => {
    const item = items[index];
    const netWeight = (parseFloat(item.grossWeight) || 0) - (parseFloat(item.lessWeight) || 0);
    const fineWeight = netWeight * ((parseFloat(item.melting) || 0) / 100) + (parseFloat(item.wastage) || 0);
    const rate = item.metalType === 'gold' ? (parseFloat(formData.goldRate) || 0) : (parseFloat(formData.silverRate) || 0);
    const amount = (fineWeight * rate) + (parseFloat(item.labourRate) || 0);

    const newItems = [...items];
    newItems[index] = {
      ...item,
      netWeight: netWeight.toFixed(3),
      fineWeight: fineWeight.toFixed(3),
      amount: amount.toFixed(2)
    };
    setItems(newItems);
  };

  const addRow = (metalType) => {
    setItems([...items, {
      metalType,
      itemName: '',
      pieces: 1,
      grossWeight: '',
      lessWeight: '',
      netWeight: '',
      melting: '',
      wastage: '',
      fineWeight: '',
      labourRate: '',
      amount: ''
    }]);
  };

  const deleteRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    return items.reduce((acc, item) => ({
      pieces: acc.pieces + (parseInt(item.pieces) || 0),
      grossWeight: acc.grossWeight + (parseFloat(item.grossWeight) || 0),
      lessWeight: acc.lessWeight + (parseFloat(item.lessWeight) || 0),
      netWeight: acc.netWeight + (parseFloat(item.netWeight) || 0),
      wastage: acc.wastage + (parseFloat(item.wastage) || 0),
      fineWeight: acc.fineWeight + (parseFloat(item.fineWeight) || 0),
      labourRate: acc.labourRate + (parseFloat(item.labourRate) || 0),
      amount: acc.amount + (parseFloat(item.amount) || 0)
    }), { pieces: 0, grossWeight: 0, lessWeight: 0, netWeight: 0, wastage: 0, fineWeight: 0, labourRate: 0, amount: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ledgerId) {
      toast.error('Please select a customer');
      return;
    }

    const totals = calculateTotals();
    const total = totals.amount + (parseFloat(formData.stoneAmount) || 0);

    // Convert all numeric fields to proper numbers
    const cleanedItems = items.map(item => ({
      metalType: item.metalType,
      itemName: item.itemName,
      pieces: parseInt(item.pieces) || 0,
      grossWeight: parseFloat(item.grossWeight) || 0,
      lessWeight: parseFloat(item.lessWeight) || 0,
      netWeight: parseFloat(item.netWeight) || 0,
      melting: parseFloat(item.melting) || 0,
      wastage: parseFloat(item.wastage) || 0,
      fineWeight: parseFloat(item.fineWeight) || 0,
      labourRate: parseFloat(item.labourRate) || 0,
      amount: parseFloat(item.amount) || 0
    }));

      voucherData = {
      ledgerId: formData.ledgerId,
      date: formData.date,
      voucherNumber: formData.voucherNumber,
      paymentType: formData.paymentType,
      goldRate: parseFloat(formData.goldRate) || 0,
      silverRate: parseFloat(formData.silverRate) || 0,
      stoneAmount: parseFloat(formData.stoneAmount) || 0,
      items: cleanedItems,
      issue: { gross: parseFloat(formData.issueGross) || 0 },
      receipt: { gross: parseFloat(formData.receiptGross) || 0 },
      narration: formData.narration
    };

    try {
      await voucherAPI.create(voucherData);
      toast.success('Voucher created successfully!');
      // Reset form
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create voucher');
    }
  };

  const totals = calculateTotals();
  const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0);

  const handlePrint = () => {
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
          .subheader { text-align: center; font-size: 14px; margin-bottom: 20px; }
          .details-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .total-row { font-weight: bold; background-color: #f5f5f5; }
          .amount-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .section-label { font-weight: bold; margin-bottom: 5px; margin-top: 10px; }
          .line-height { height: 30px; border-bottom: 1px solid #000; }
          .voucher-container { max-width: 900px; margin: 0 auto; }
          .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
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
              <div>Name : <strong>${ledgers.find(l => l._id === formData.ledgerId)?.name || 'N/A'}</strong></div>
              <div>Voucher No : <strong>${formData.voucherNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <div>Date : ${new Date(formData.date).toLocaleDateString('en-IN')}</div>
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
                <th style="width: 10%;">Wastage</th>
                <th style="width: 10%;">Fine Wt</th>
                <th style="width: 10%;">Lab Rt</th>
                <th style="width: 10%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td>${item.pieces}</td>
                  <td>${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.wastage).toFixed(3)}</td>
                  <td>${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td>${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #f5f5f5;">
                <td colspan="2">Total</td>
                <td>${items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.wastage) || 0), 0).toFixed(3)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</td>
                <td>${items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Stone Amount :</div>
              <div>${parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Labour :</div>
              <div>${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Net Balance :</div>
              <div style="height: 30px; border-bottom: 1px solid #000;"></div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Narration :</div>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
            </div>

            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Gold Rate :</div>
              <div>${parseFloat(formData.goldRate || 0).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Silver Rate :</div>
              <div>${parseFloat(formData.silverRate || 0).toFixed(2)}</div>
              
              <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Issue</div>
                  <div>${parseFloat(formData.issueGross || 0).toFixed(3)}</div>
                </div>
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Recept</div>
                  <div>${parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
                </div>
              </div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 15px;">Old Bal Amt :</div>
              <div>${ledgers.find(l => l._id === formData.ledgerId)?.balances?.amount?.toFixed(2) || '0.00'}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Old Bal Fine Wt :</div>
              <div>${(((ledgers.find(l => l._id === formData.ledgerId)?.balances?.goldFineWeight || 0) + (ledgers.find(l => l._id === formData.ledgerId)?.balances?.silverFineWeight || 0))).toFixed(3)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 15px;">Cur Bal Amt :</div>
              <div>${((parseFloat(ledgers.find(l => l._id === formData.ledgerId)?.balances?.amount || 0)) - (items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0))).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Cur Bal Net Wt :</div>
              <div>${((((ledgers.find(l => l._id === formData.ledgerId)?.balances?.goldFineWeight || 0) + (ledgers.find(l => l._id === formData.ledgerId)?.balances?.silverFineWeight || 0))) - items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0)).toFixed(3)}</div>
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

  const handleShare = () => {
    const ledger = ledgers.find(l => l._id === formData.ledgerId);
    const grandTot = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0);
    
    const voucherText = `ESTIMATE/ON APPROVAL - Issue

Name: ${ledger?.name || 'N/A'}
Voucher No: ${formData.voucherNumber}
Date: ${new Date(formData.date).toLocaleDateString('en-IN')}

Items Summary:
- Total Pieces: ${items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0)}
- Total Net Wt: ${items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3)}
- Total Fine Wt: ${items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3)}
- Total Amount: ₹${items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}

Stone Amount: ₹${parseFloat(formData.stoneAmount || 0).toFixed(2)}
Fine Amount: ₹${parseFloat(formData.fineAmount || 0).toFixed(2)}
Grand Total: ₹${grandTot.toFixed(2)}

Gold Rate: ₹${parseFloat(formData.goldRate || 0).toFixed(2)}`;

    if (navigator.share) {
      navigator.share({
        title: `Voucher #${formData.voucherNumber}`,
        text: voucherText
      }).catch(err => {
        if (err.name !== 'AbortError') {
          toast.error('Error sharing voucher');
        }
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(voucherText).then(() => {
        toast.success('Voucher details copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy to clipboard');
      });
    }
  };

  return (
    <Layout>
      <style>{`
        @media (max-width: 768px) {
          .card .input {
            width: 100% !important;
            min-width: unset !important;
          }
          .card table input {
            width: 100% !important;
            min-width: 70px;
          }
        }
      `}</style>
      <div>
        <h1 style={{ marginBottom: '2rem' }}>Billing</h1>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
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
              
              <div className="input-group">
                <label className="input-label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Voucher Number</label>
                <input
                  type="text"
                  className="input"
                  value={formData.voucherNumber}
                  onChange={(e) => setFormData({...formData, voucherNumber: e.target.value})}
                  disabled={user?.voucherSettings?.autoIncrement}
                  required
                />
              </div>
            </div>

            <div className="grid grid-3">
              <div className="input-group">
                <label className="input-label">Payment Type</label>
                <select
                  className="input"
                  value={formData.paymentType}
                  onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              
              <div className="input-group">
                <label className="input-label">Gold Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.goldRate}
                  onChange={(e) => setFormData({...formData, goldRate: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Silver Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.silverRate}
                  onChange={(e) => setFormData({...formData, silverRate: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Sl</th>
                  <th>Item Name</th>
                  <th>Pcs</th>
                  <th>Gross Wt</th>
                  <th>Less</th>
                  <th>Net Wt</th>
                  <th>Wastage</th>
                  <th>Fine Wt</th>
                  <th>Lab Rate</th>
                  <th>Amount</th>
                  <th style={{ width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={item.itemName}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].itemName = e.target.value;
                          setItems(newItems);
                        }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input"
                        value={item.pieces}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].pieces = e.target.value;
                          setItems(newItems);
                        }}
                        style={{ width: '70px' }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="input"
                        value={item.grossWeight}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].grossWeight = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                        style={{ width: '90px' }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="input"
                        value={item.lessWeight}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].lessWeight = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="input"
                        value={item.netWeight}
                        disabled
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="input"
                        value={item.wastage}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].wastage = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        className="input"
                        value={item.fineWeight}
                        disabled
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={item.labourRate}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].labourRate = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={item.amount}
                        disabled
                        style={{ width: '100px' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        className="btn btn-sm btn-danger"
                        disabled={items.length === 1}
                      >
                        <FiX />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                  <td colSpan="2">Total</td>
                  <td>{totals.pieces}</td>
                  <td>{totals.grossWeight.toFixed(3)}</td>
                  <td>{totals.lessWeight.toFixed(3)}</td>
                  <td>{totals.netWeight.toFixed(3)}</td>
                  <td>{totals.wastage.toFixed(3)}</td>
                  <td>{totals.fineWeight.toFixed(3)}</td>
                  <td>{totals.labourRate.toFixed(2)}</td>
                  <td>{totals.amount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => addRow('gold')} className="btn btn-sm btn-primary">
                <FiPlus /> Add Gold Row
              </button>
              <button type="button" onClick={() => addRow('silver')} className="btn btn-sm btn-secondary">
                <FiPlus /> Add Silver Row
              </button>
            </div>
          </div>

          <div className="card">
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Stone Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.stoneAmount}
                  onChange={(e) => setFormData({...formData, stoneAmount: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Issue (Gross)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={formData.issueGross}
                  onChange={(e) => setFormData({...formData, issueGross: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Receipt (Gross)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={formData.receiptGross}
                  onChange={(e) => setFormData({...formData, receiptGross: e.target.value})}
                />
              </div>
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

            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                Total: ₹{grandTotal.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                <FiSave /> Save
              </button>
              <button type="button" onClick={handlePrint} className="btn btn-secondary">
                <FiPrinter /> Print
              </button>
              <button type="button" onClick={handleShare} className="btn btn-secondary">
                <FiShare2 /> Share
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
